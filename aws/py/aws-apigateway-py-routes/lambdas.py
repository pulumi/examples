# Copyright 2016-2021, Pulumi Corporation.
import pulumi
import pulumi_aws as aws

lambda_role = aws.iam.Role('auth-lambda-role',
                           assume_role_policy="""{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Action": "sts:AssumeRole",
                "Principal": {
                    "Service": "lambda.amazonaws.com"
                },
                "Effect": "Allow",
                "Sid": ""
            }
        ]
    }"""
                           )

lambda_role_policy = aws.iam.RolePolicy('auth-lambda-role-policy',
                                        role=lambda_role.id,
                                        policy="""{
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
    }"""
                                        )

# Create a Lambda function to validate request authorization
auth_lambda = aws.lambda_.Function("auth-lambda",
                                   role=lambda_role.arn,
                                   runtime=aws.lambda_.Runtime.PYTHON3D8,
                                   code=pulumi.AssetArchive({
                                       ".": pulumi.FileArchive("./authorizer"),
                                   }),
                                   handler="handler.handler",
                                   )

# Create a Lambda function to respond to HTTP requests
hello_handler = aws.lambda_.Function("hello-handler",
                                     role=lambda_role.arn,
                                     runtime=aws.lambda_.Runtime.PYTHON3D8,
                                     code=pulumi.AssetArchive({
                                         ".": pulumi.FileArchive("./handler"),
                                     }),
                                     handler="handler.handler",
                                     )
