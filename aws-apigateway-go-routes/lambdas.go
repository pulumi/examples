// Copyright 2016-2021, Pulumi Corporation.
package main

import (
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/iam"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/lambda"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func createLambdas(ctx *pulumi.Context) (*lambda.Function, *lambda.Function, error) {
	role, err := iam.NewRole(ctx, "auth-exec-role", &iam.RoleArgs{
		AssumeRolePolicy: pulumi.String(`{
				"Version": "2012-10-17",
				"Statement": [{
					"Sid": "",
					"Effect": "Allow",
					"Principal": {
						"Service": "lambda.amazonaws.com"
					},
					"Action": "sts:AssumeRole"
				}]
			}`),
	})
	if err != nil {
		return nil, nil, err
	}

	logPolicy, err := iam.NewRolePolicy(ctx, "lambda-log-policy", &iam.RolePolicyArgs{
		Role: role.Name,
		Policy: pulumi.String(`{
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
            }`),
	})
	if err != nil {
		return nil, nil, err
	}

	authLambda, err := lambda.NewFunction(ctx, "auth-lambda", &lambda.FunctionArgs{
		Runtime: lambda.RuntimeGo1dx,
		Code: pulumi.NewAssetArchive(map[string]interface{}{
			".": pulumi.NewFileArchive("./bin/authorizer.zip"),
		}),
		Handler: pulumi.String("authorizer"),
		Role:    role.Arn,
	}, pulumi.DependsOn([]pulumi.Resource{logPolicy}))
	if err != nil {
		return nil, nil, err
	}

	helloHandler, err := lambda.NewFunction(ctx, "hello-handler", &lambda.FunctionArgs{
		Runtime: lambda.RuntimeGo1dx,
		Code: pulumi.NewAssetArchive(map[string]interface{}{
			".": pulumi.NewFileArchive("./bin/handler.zip"),
		}),
		Handler: pulumi.String("handler"),
		Role:    role.Arn,
	}, pulumi.DependsOn([]pulumi.Resource{logPolicy}))
	if err != nil {
		return nil, nil, err
	}
	return authLambda, helloHandler, nil
}
