// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function createIamRole(name: string, table: aws.dynamodb.Table) {
    const role = new aws.iam.Role(`${name}-role`, {
        assumeRolePolicy: aws.iam.getPolicyDocument({
                statements: [{
                    actions: ["sts:AssumeRole"],
                    principals: [{
                        identifiers: ["appsync.amazonaws.com"],
                        type: "Service",
                    }],
                    effect: "Allow",
                }],
            }, { async: true }).then(doc => doc.json),
    });

    const policy = new aws.iam.Policy(`${name}-policy`, {
        policy: table.arn.apply(arn => aws.iam.getPolicyDocument({
            statements: [{
                actions: ["dynamodb:PutItem", "dynamodb:GetItem"],
                resources: [arn],
                effect: "Allow",
            }],
        }, { async: true }).then(doc => doc.json)),
    });

    const attachment = new aws.iam.RolePolicyAttachment(`${name}-rpa`, {
        role: role,
        policyArn: policy.arn,
    });

    return role;
}
