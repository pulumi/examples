// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as athena from "athena-client";
import { resolve } from "path";

import { PulumiRunner } from "../testing/integration";

jest.setTimeout(360000);

let runner: PulumiRunner;
const region = "us-west-2";

beforeAll(async () => {
    const config: { [key: string]: string } = {
        "aws:region": region,
        "aws-ts-serverless-datawarehouse:dev": "true",
    };

    const pulumiProjDir = resolve("./");
    runner = new PulumiRunner(config, pulumiProjDir);
    const setupResult = await runner.setup();
    if (!setupResult.success) {
        throw new Error(`Pulumi setup failed, aborting: ${setupResult.error}`);
    }
});

afterAll(async () => {
    const teardownResult = await runner.teardown();
    if (!teardownResult.success) {
        throw new Error(`Pulumi teardown failed. Test stack has leaked: ${teardownResult.error}`);
    }
});

test("WithStreamingInput integrtion test", async () => {
    expect(runner.getStackOutputKeys().length).toBe(6);
    const db = runner.getStackOutput("databaseName");
    const clickTable = runner.getStackOutput("clickTableName");
    const impressionTable = runner.getStackOutput("impressionTableName");
    const bucket = runner.getStackOutput("athenaResultsBucket");

    const clickPromise = verifyRecordsInTable(db, clickTable, bucket);
    const impressionPromise = verifyRecordsInTable(db, impressionTable, bucket);

    const [clickTableHasRecords, impressionTableHasRecords] = await Promise.all([clickPromise, impressionPromise]);

    expect(clickTableHasRecords).toBe(true);
    expect(impressionTableHasRecords).toBe(true);
});

const verifyRecordsInTable = async (db: string, table: string, bucket: string) => {
    const bucketUri = `s3://${bucket}`;
    const clientConfig = {
        bucketUri,
    };
    const awsConfig = {
        region,
    };
    const athenaClient = athena.createClient(clientConfig, awsConfig);

    let didFindResults = false;
    const query = `select * from ${db}.${table} limit 10;`;
    console.log(query);
    let retry = 0;
    while (retry < 5) {
        const result = await athenaClient.execute(query).toPromise();
        console.log(JSON.stringify(result));
        if (result.records.length > 0) {
            didFindResults = true;
            break;
        }
        else {
            retry++;
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
    }

    return didFindResults;
};
