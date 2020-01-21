import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { CallbackFunction } from "@pulumi/aws/lambda";
import { EventRuleEvent } from "@pulumi/aws/cloudwatch";
import { getS3Location } from "../../utils";
import { createPartitionDDLStatement } from "./partitionHelper";
import { LambdaCronJob, LambdaCronJobArgs } from "../lambdaCron";

export class HourlyPartitionRegistrar extends pulumi.ComponentResource {

    constructor(name: string, args: PartitionRegistrarArgs, opts?: pulumi.ComponentResourceOptions) {
        super("serverless:partition_registrar", name, opts);
        const { dataWarehouseBucket, athenaResultsBucket, scheduleExpression, table, partitionKey } = args;
        const location = getS3Location(dataWarehouseBucket, table);

        const resultsBucket = athenaResultsBucket.arn.apply(a => `s3://${a.split(":::")[1]}`);

        const policyARNsToAttach = [
            aws.iam.ManagedPolicies.AmazonAthenaFullAccess,
        ];


        const schedule = scheduleExpression ? scheduleExpression : `rate(1 hour)`;

        const partitionRegistrarFn = (event: EventRuleEvent) => {
            const athena = require("athena-client");
            const clientConfig = {
                bucketUri: resultsBucket.get()
            };
            const awsConfig = {
                region: args.region
            };

            const client = athena.createClient(clientConfig, awsConfig);

            const query = createPartitionDDLStatement(args.database.name.get(), table, location.get(), partitionKey, event.time);

            client.execute(query, (err: Error) => {
                if (err) {
                    throw err;
                }
            })
        };

        const cronArgs: LambdaCronJobArgs = {
            jobFn: partitionRegistrarFn,
            scheduleExpression: schedule,
            policyARNsToAttach
        }

        new LambdaCronJob(name, cronArgs, { parent: this });
    }
}

export interface PartitionRegistrarArgs {
    table: string;
    partitionKey: string;
    dataWarehouseBucket: aws.s3.Bucket;
    athenaResultsBucket: aws.s3.Bucket;
    database: aws.glue.CatalogDatabase;
    region: string;
    scheduleExpression?: string;
}