import * as aws from "@pulumi/aws";

const region = aws.config.requireRegion();

const lambdaRole = new aws.iam.Role("lambdaRole", {
    assumeRolePolicy: JSON.stringify({
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
    })
});

const lambdaRolePolicy = new aws.iam.RolePolicy("lambdaRolePolicy", {
    role: lambdaRole.id,
    policy: JSON.stringify({
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        }]
    })
});

const sfnRole = new aws.iam.Role("sfnRole", {
    assumeRolePolicy: JSON.stringify({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": `states.${region}.amazonaws.com`
                },
                "Action": "sts:AssumeRole"
            }
        ]
    })
});

const sfnRolePolicy = new aws.iam.RolePolicy("sfnRolePolicy", {
    role: sfnRole.id,
    policy: JSON.stringify({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "lambda:InvokeFunction"
                ],
                "Resource": "*"
            }
        ]
    })
});

const helloWorldFunction = new aws.serverless.Function(
    "helloWorldFunction",
    { role: lambdaRole },
    (event, context, callback) => {
        callback(null, "Hello world!");
    }
);

const stateMachine = new aws.sfn.StateMachine("stateMachine", {
    roleArn: sfnRole.arn,
    definition: helloWorldFunction.lambda.arn.apply(lambdaArn => {
        return JSON.stringify({
            "Comment": "A Hello World example of the Amazon States Language using an AWS Lambda Function",
            "StartAt": "HelloWorld",
            "States": {
                "HelloWorld": {
                    "Type": "Task",
                    "Resource": lambdaArn,
                    "End": true
                }
            }
        });
    }),
});

exports.stateMachineArn = stateMachine.id;
