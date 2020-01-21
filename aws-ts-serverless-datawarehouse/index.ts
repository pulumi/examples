// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { S3 } from "aws-sdk";

import { ARN } from "@pulumi/aws";
import { EventRuleEvent } from "@pulumi/aws/cloudwatch";
import * as moment from "moment-timezone";

import { BatchInputTableArgs, ServerlessDataWarehouse, StreamingInputTableArgs, TableArgs } from "./datawarehouse";
import { EventGenerator } from "./testing/eventGenerator";

// app specific config
const config = new pulumi.Config();
const awsConfig = new pulumi.Config("aws");
const region = awsConfig.require("region");
const isDev = config.get("dev") === "true";

// during development we run all of our crons
// at a faster cadence to expedite testing
const cronUnit = isDev ? "minute" : "hour";
const scheduleExpression = `rate(1 ${cronUnit})`;
const fileFlushIntervalSeconds = isDev ? 60 : 900;

// dw w/ streaming input table
const columns = [
    {
        name: "id",
        type: "string",
    },
    {
        name: "session_id",
        type: "string",
    },
    {
        name: "event_time",
        type: "string",
    },
];

const impressionsTableName = "impressions";
const clicksTableName = "clicks";

const genericTableArgs: StreamingInputTableArgs = {
    columns,
    inputStreamShardCount: 1,
    region,
    partitionScheduleExpression: scheduleExpression,
    fileFlushIntervalSeconds,
};

// create two tables with kinesis input streams, writing data into hourly partitions in S3.
const dataWarehouse = new ServerlessDataWarehouse("analytics_dw", { isDev })
    .withStreamingInputTable(impressionsTableName, genericTableArgs)
    .withStreamingInputTable(clicksTableName, genericTableArgs);

const impressionsInputStream = dataWarehouse.getInputStream(impressionsTableName);
const clicksInputStream = dataWarehouse.getInputStream(clicksTableName);


// Export a batch of outputs from the first two tables.
export const impressionInputStream = impressionsInputStream.name;
export const clickInputStream = clicksInputStream.name;
export const databaseName = dataWarehouse.database.name;
export const impressionTableName = dataWarehouse.getTable(impressionsTableName).name;
export const clickTableName = dataWarehouse.getTable(clicksTableName).name;
export const athenaResultsBucket = dataWarehouse.queryResultsBucket.bucket;

const dwBucket = dataWarehouse.dataWarehouseBucket.bucket;

// Configure batch input table 'aggregates'
const aggregateTableName = "aggregates";

const aggregateTableColumns = [
    {
        name: "event_type",
        type: "string",
    },
    {
        name: "count",
        type: "int",
    },
    {
        name: "time",
        type: "string",
    },
];

const aggregationFunction = async (event: EventRuleEvent) => {
    const athena = require("athena-client");
    const bucketUri = `s3://${athenaResultsBucket.get()}`;
    const clientConfig = {
        bucketUri,
    };
    const awsConfig = {
        region,
    };
    const athenaClient = athena.createClient(clientConfig, awsConfig);
    const date = moment(event.time);
    const partitionKey = date.utc().format("YYYY/MM/DD/HH");
    const getAggregateQuery = (table: string) => `select count(*) from ${databaseName.get()}.${table} where inserted_at='${partitionKey}'`;
    const clicksPromise = athenaClient.execute(getAggregateQuery(clicksTableName)).toPromise();
    const impressionsPromise = athenaClient.execute(getAggregateQuery(impressionsTableName)).toPromise();

    const clickRows = await clicksPromise;
    const impressionRows = await impressionsPromise;
    const clickCount = clickRows.records[0]["_col0"];
    const impressionsCount = impressionRows.records[0]["_col0"];
    const data = `{ "event_type": "${clicksTableName}", "count": ${clickCount}, "time": "${partitionKey}" }\n{ "event_type": "${impressionsTableName}", "count": ${impressionsCount}, "time": "${partitionKey}"}`;
    const s3Client = new S3();
    await s3Client.putObject({
        Bucket: dwBucket.get(),
        Key: `${aggregateTableName}/${partitionKey}/results.json`,
        Body: data,
    }).promise();
};

const policyARNsToAttach: pulumi.Input<ARN>[] = [
    aws.iam.ManagedPolicies.AmazonAthenaFullAccess,
    aws.iam.ManagedPolicies.AmazonS3FullAccess,
];

const aggregateTableArgs: BatchInputTableArgs = {
    columns: aggregateTableColumns,
    jobFn: aggregationFunction,
    scheduleExpression,
    policyARNsToAttach,
    dataFormat: "JSON",
};

dataWarehouse.withBatchInputTable(aggregateTableName, aggregateTableArgs);

// create a static fact table
const factTableName = "facts";
const factColumns = [
    {
        name: "thing",
        type: "string",
    },
    {
        name: "color",
        type: "string",
    },
];

const factTableArgs: TableArgs = {
    columns: factColumns,
    dataFormat: "JSON",
};

dataWarehouse.withTable("facts", factTableArgs);

// Load a static facts file into the facts table.
const data = `{"thing": "sky", "color": "blue"}\n{ "thing": "seattle sky", "color": "grey"}\n{ "thing": "oranges", "color": "orange"}`;

const factJSON = new aws.s3.BucketObject("factsFile", {
    bucket: dataWarehouse.dataWarehouseBucket,
    content: data,
    key: `${factTableName}/facts.json`,
});

// conditionally create mock data for development
if (isDev) {
    const impressionsGenerator = new EventGenerator("impressions-generator", { inputStreamName: impressionsInputStream.name, eventType: "impressions" });
    const clicksGenerator = new EventGenerator("clicks-generator", { inputStreamName: clicksInputStream.name, eventType: "clicks" });
}
