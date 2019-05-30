import * as aws from "@pulumi/aws";

export function createIamRole(name: string, table: aws.dynamodb.Table) {
    const role = new aws.iam.Role(`${name}-role`, {
        assumeRolePolicy: JSON.stringify({
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "sts:AssumeRole",
                    "Principal": {
                    "Service": "appsync.amazonaws.com"
                    },
                    "Effect": "Allow"
                },
            ]
        }),
    });

    const policy = new aws.iam.Policy(`${name}-policy`, {
        policy: table.arn.apply(arn => JSON.stringify({
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": ["dynamodb:PutItem", "dynamodb:GetItem"],
                    "Effect": "Allow",
                    "Resource": [arn],
                },
            ],
        }))
    });

    new aws.iam.RolePolicyAttachment(`${name}-rpa`, {
        role: role,
        policyArn: policy.arn,
    });

    return role;
}
