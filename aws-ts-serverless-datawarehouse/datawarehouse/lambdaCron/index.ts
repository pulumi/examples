import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { CallbackFunction } from "@pulumi/aws/lambda";
import { EventRuleEvent } from "@pulumi/aws/cloudwatch";
import { getS3Location } from "../../utils";
import { ARN } from "@pulumi/aws";

export class LambdaCronJob extends pulumi.ComponentResource {

    constructor(name: string, args: LambdaCronJobArgs, opts?: pulumi.ComponentResourceOptions) { 
        super("serverless:lambda_cron_job", name, opts);
        const options  = { parent: this }; 
        const { scheduleExpression, jobFn, policyARNsToAttach } = args;

        let lambdaAssumeRolePolicy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "sts:AssumeRole",
                    "Principal": {
                        "Service": "lambda.amazonaws.com",
                    },
                    "Effect": "Allow",
                    "Sid": "",
                },
            ],
        };

        const partitionRole = new aws.iam.Role(`${name}-Role`, {
            assumeRolePolicy: JSON.stringify(lambdaAssumeRolePolicy)
        }, options);

        if(policyARNsToAttach) {
            for(let i = 0; i < policyARNsToAttach.length; i++) {
                new aws.iam.RolePolicyAttachment(`${name}-Attachment-${i}`, {
                    role: partitionRole,
                    policyArn: policyARNsToAttach[i],
                }, options);
            }
        }

        // always attach the lambda policy for logging, etc. 
        new aws.iam.RolePolicyAttachment(`${name}-Attachment-lambda`, {
            role: partitionRole,
            policyArn: aws.iam.ManagedPolicies.AWSLambdaFullAccess,
        }, options);

        const cron = new aws.cloudwatch.EventRule(`${name}-cron`, {
            scheduleExpression
        }, options);

        cron.onEvent(`${name}-cronJob`, new CallbackFunction(`${name}-callback`, {
            role: partitionRole,
            callback: jobFn,
            timeout: 900
        }, options), options);
    }
}

export interface LambdaCronJobArgs {
   jobFn: (event: EventRuleEvent) => any;
    scheduleExpression: string;
    policyARNsToAttach?: pulumi.Input<ARN>[];
}