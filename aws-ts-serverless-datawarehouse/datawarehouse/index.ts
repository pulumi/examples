// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import { ARN } from "@pulumi/aws";
import { EventRuleEvent } from "@pulumi/aws/cloudwatch";
import { BucketArgs } from "@pulumi/aws/s3";
import { input } from "@pulumi/aws/types";
import * as pulumi from "@pulumi/pulumi";
import { getS3Location } from "../utils";
import { InputStream, InputStreamArgs } from "./inputStream";
import { LambdaCronJob, LambdaCronJobArgs } from "./lambdaCron";
import { HourlyPartitionRegistrar, PartitionRegistrarArgs } from "./partitionRegistrar";

export class ServerlessDataWarehouse extends pulumi.ComponentResource {

    public dataWarehouseBucket: aws.s3.Bucket;
    public queryResultsBucket: aws.s3.Bucket;
    public database: aws.glue.CatalogDatabase;
    private tables: { [key: string]: aws.glue.CatalogTable } = {};
    private inputStreams: { [key: string]: aws.kinesis.Stream } = {};

    constructor(name: string, args: DataWarehouseArgs = {}, opts: pulumi.ComponentResourceOptions = {}) {
        super("serverless:data_warehouse", name, opts);

        const bucketArgs: BucketArgs | undefined = args.isDev ? { forceDestroy: true } : undefined;

        const dataWarehouseBucket = new aws.s3.Bucket("datawarehouse-bucket", bucketArgs, { parent: this });
        const queryResultsBucket = new aws.s3.Bucket("query-results-bucket", bucketArgs, { parent: this });

        const database =  args.database || new aws.glue.CatalogDatabase(name, {
            name,
        }, { parent: this });


        this.dataWarehouseBucket = dataWarehouseBucket;
        this.queryResultsBucket = queryResultsBucket;
        this.database = database;
    }

    public withTable(name: string, args: TableArgs): ServerlessDataWarehouse {
        if (this.tables[name]) {
            throw new Error(`Duplicate table! Name: ${name}`);
        }

        const dataFormat = this.validateFormatAndGetDefault(args.dataFormat);

        const table = this.createTable(name, args.columns, dataFormat, args.partitionKeys);
        this.tables[name] = table;

        return this;
    }

    public withStreamingInputTable(name: string, args: StreamingInputTableArgs): ServerlessDataWarehouse {
        const { partitionKeyName, columns, inputStreamShardCount, fileFlushIntervalSeconds } = args;
        const partitionKey = partitionKeyName ? partitionKeyName : "inserted_at";

        const partitionKeys: input.glue.CatalogTablePartitionKey[] = [{
            name: partitionKey,
            type: "string",
        }];

        const tableArgs: TableArgs = {
            columns,
            partitionKeys,
        };

        this.withTable(name, tableArgs);

        const streamArgs: InputStreamArgs = {
            destinationBucket: this.dataWarehouseBucket,
            shardCount: inputStreamShardCount,
            databaseName: this.database.name,
            tableName: name,
            fileFlushIntervalSeconds,
        };

        const { inputStream } = new InputStream(`inputstream-${name}`, streamArgs, { parent: this });
        this.inputStreams[name] = inputStream;

        const registrarArgs: PartitionRegistrarArgs = {
            database: this.database,
            partitionKey,
            region: args.region,
            dataWarehouseBucket: this.dataWarehouseBucket,
            athenaResultsBucket: this.queryResultsBucket,
            table: name,
            scheduleExpression: args.partitionScheduleExpression,
        };
        const partitionRegistrar = new HourlyPartitionRegistrar(`${name}-partitionregistrar`, registrarArgs, { parent: this });

        return this;
    }

    public withBatchInputTable(name: string, args: BatchInputTableArgs): ServerlessDataWarehouse {
        const { columns, partitionKeys, jobFn, scheduleExpression, policyARNsToAttach, dataFormat } = args;
        const tableArgs: TableArgs = {
            columns,
            partitionKeys,
            dataFormat,
        };

        this.withTable(name, tableArgs);

        const lambdaCronArgs: LambdaCronJobArgs = {
            jobFn,
            scheduleExpression,
            policyARNsToAttach,
        };

        const batchInputJob = new LambdaCronJob(name, lambdaCronArgs, { parent: this });

        return this;
    }

    public getTable(name: string): aws.glue.CatalogTable {
        const table = this.tables[name];
        if (!table) {
            throw new Error(`Table '${name}' does not exist.`);
        }

        return table;
    }

    public listTables(): string[] {
        return Object.keys(this.tables);
    }

    public getInputStream(tableName: string): aws.kinesis.Stream {
        const stream = this.inputStreams[tableName];
        if (!stream) {
            throw new Error(`Input stream for table '${tableName}' does not exist.`);
        }

        return stream;
    }

    private validateFormatAndGetDefault(dataFormat: DataFormat | undefined) {
        let format = dataFormat;
        const defaultFormat: DataFormat = "parquet";

        switch (format) {
            case "parquet":
                break;
            case "JSON":
                break;
            case undefined:
                format = defaultFormat;
                break;
            default:
                throw new Error(`dataFormat must be one of 'JSON' or 'parquet'. Encountered unknown value: ${dataFormat}`);
        }

        return format;
    }

    private createTable(name: string, columns: input.glue.CatalogTableStorageDescriptorColumn[], dataFormat: DataFormat, partitionKeys?: input.glue.CatalogTablePartitionKey[]): aws.glue.CatalogTable {
        const location = getS3Location(this.dataWarehouseBucket, name);

        const parquetStorageDescriptor = {
            location,
            inputFormat: "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat",
            outputFormat: "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat",
            serDeInfo: {
                parameters: { "serialization.format": "1" },
                name: "ParquetHiveSerDe",
                serializationLibrary: "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe",
            },
            columns,
        };

        const jsonStorageDescriptor = {
            location,
            inputFormat: "org.apache.hadoop.mapred.TextInputFormat",
            outputFormat: "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
            serDeInfo: {
                name: "OpenXJSONSerDe",
                serializationLibrary: "org.openx.data.jsonserde.JsonSerDe",
            },
            columns,
        };

        const storageDescriptor = dataFormat === "JSON" ? jsonStorageDescriptor : parquetStorageDescriptor;
        return new aws.glue.CatalogTable(name, {
            name: name,
            databaseName: this.database.name,
            tableType: "EXTERNAL_TABLE",
            storageDescriptor,
            partitionKeys,
        }, { parent: this });
    }

}

export interface DataWarehouseArgs {
    database?: aws.glue.CatalogDatabase;
    isDev?: boolean;
}

export type DataFormat = "JSON" | "parquet";

export interface TableArgs {
    columns: input.glue.CatalogTableStorageDescriptorColumn[];
    partitionKeys?: input.glue.CatalogTablePartitionKey[];
    dataFormat?: DataFormat;
}

export interface StreamingInputTableArgs {
    columns: input.glue.CatalogTableStorageDescriptorColumn[];
    inputStreamShardCount: number;
    region: string;
    partitionKeyName?: string;
    partitionScheduleExpression?: string;
    fileFlushIntervalSeconds?: number;
}

export interface BatchInputTableArgs {
    columns: input.glue.CatalogTableStorageDescriptorColumn[];
    partitionKeys?: input.glue.CatalogTablePartitionKey[];
    jobFn: (event: EventRuleEvent) => any;
    scheduleExpression: string;
    policyARNsToAttach?: pulumi.Input<ARN>[];
    dataFormat?: DataFormat;
}
