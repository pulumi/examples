// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import { EventRuleEvent } from "@pulumi/aws/cloudwatch";
import * as pulumi from "@pulumi/pulumi";
import { LambdaCronJob, LambdaCronJobArgs } from "../../datawarehouse/lambdaCron";

export class EventGenerator extends pulumi.ComponentResource {
    constructor(name: string, args: EventGeneratorArgs, opts?: pulumi.CustomResourceOptions) {
        super("serverless:event_generator", name, opts);

        const { eventType, inputStreamName } = args;

        const eventGenCallback = (event: EventRuleEvent) => {
            const AWS = require("aws-sdk");
            const uuid = require("uuid/v4");
            const kinesis = new AWS.Kinesis();
            const records: any = [];

            const sessionId = uuid();
            const eventId = uuid();
            const record = {
                Data: JSON.stringify({
                    id: eventId,
                    session_id: sessionId,
                    event_time: event.time,
                }),
                PartitionKey: sessionId,
            };
            records.push(record);

            kinesis.putRecords({
                Records: records,
                StreamName: inputStreamName.get(),
            }, (err: any) => {
                if (err) {
                    console.error(err);
                }
            });
        };

        const lambdaCronArgs: LambdaCronJobArgs = {
            jobFn: eventGenCallback,
            scheduleExpression: "rate(1 minute)",
            policyARNsToAttach: [
                aws.iam.ManagedPolicies.AmazonKinesisFullAccess,
            ],
        };

        const eventGenerator = new LambdaCronJob(`${eventType}-eventGenerator`, lambdaCronArgs, { parent: this });
    }
}

export interface EventGeneratorArgs {
    inputStreamName: pulumi.Output<string>;
    eventType: string;
}
