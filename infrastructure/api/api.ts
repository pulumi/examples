import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

import { Octokit } from "@octokit/rest";

import { awsRegion, apiKey, gitHubTokenSecretID } from "./config";
import { examplesTableName } from "./db";

const lambdaRole = new aws.iam.Role("api-lambda-role", {
    assumeRolePolicy: {
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Action: "sts:AssumeRole",
                Principal: {
                    Service: "lambda.amazonaws.com"
                },
            },
        ],
    },
});

const lambdaRolePolicy = new aws.iam.Policy("api-lambda-role-policy", {
    policy: {
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Action: [
                    "secretsmanager:GetSecretValue",
                ],
                Resource: [
                    // TODO: Only allow access to the configured Pulumi access token.
                    "*",
                ],
            },
            {
                Effect: "Allow",
                Action: [
                    "dynamodb:Scan",
                    "dynamodb:GetItem",
                    "dynamodb:PutItem",
                    "secretmanager:GetSecretValue",
                ],
                Resource: [
                    // TODO: Only allow access to the resources defined by the program.
                    "*",
                ],
            },
            {
                Effect: "Allow",
                Action: "logs:*",
                Resource: "arn:aws:logs:*:*:*",
            },
        ],
    },
});

const lambdaRolePolicyAttachment = new aws.iam.RolePolicyAttachment("api-lambda-role-policy-attachment", {
    role: lambdaRole.name,
    policyArn: lambdaRolePolicy.arn,
});

const createExampleHandler = new aws.lambda.CallbackFunction("api-create-example-handler", {
    role: lambdaRole.arn,
    callback: async (event: any) => {
        const body = Buffer.from(event.body, "base64").toString();
        const { ref: gitHubRef = "master", path: examplePath } = JSON.parse(body);

        if (!examplePath) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing required parameter 'path'." }),
            };
        }

        // Fetch the GitHub access token to use for the workflow trigger.
        const secretsManager = new aws.sdk.SecretsManager({ region: awsRegion });
        const gitHubToken = await secretsManager.getSecretValue({
            SecretId: gitHubTokenSecretID.get(),
        }).promise();

        const octokit = new Octokit({
            auth: gitHubToken.SecretString,
        });

        await octokit.request("POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches", {
            owner: "pulumi",
            repo: "examples",
            workflow_id: "run-example.yml",
            ref: gitHubRef,
            inputs: {
                example_path: examplePath,
            },
            headers: {
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });

        return {
            statusCode: 202,
            body: JSON.stringify({ someKey: "some-value" }),
        };
    },
});

const updateExampleHandler = new aws.lambda.CallbackFunction("api-update-example-handler", {
    role: lambdaRole.arn,
    callback: async (event: any) => {
        const body = Buffer.from(event.body, "base64").toString();
        const { example } = JSON.parse(body);

        if (!example) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing required parameter 'example'." }),
            };
        }

        const client = new aws.sdk.DynamoDB.DocumentClient({
            region: awsRegion,
        });

        await client.put({
            TableName: examplesTableName.get(),
            Item: JSON.parse(JSON.stringify(example)), // So the Dates are serialized for DynamoDB.
        }).promise();

        return {
            statusCode: 204,
            body: JSON.stringify({ someKey: "some-value" }),
        };
    },
});

const deleteExampleHandler = new aws.lambda.CallbackFunction("api-delete-example-handler", {
    role: lambdaRole.arn,
    callback: async (event: any) => {
        const id = decodeURIComponent(event.pathParameters?.id!);

        const client = new aws.sdk.DynamoDB.DocumentClient({ region: awsRegion });
        const item = await client.delete({
            TableName: examplesTableName.get(),
            Key: {
                "id": id,
            },
        }).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({
                someKey: "some-value",
            }),
        };
    },
});

const listExamplesHandler = new aws.lambda.CallbackFunction("api-list-examples-handler", {
    role: lambdaRole.arn,
    callback: async (event: any) => {
        const client = new aws.sdk.DynamoDB.DocumentClient({ region: awsRegion });
        const items = await client.scan({
            TableName: examplesTableName.get(),
            ProjectionExpression: "id, title, description, readme, program, stack, lastUpdate",
        }).promise();

        return {
            statusCode: 200,
            body: JSON.stringify(items.Items),
        };
    },
});

const getExampleHandler = new aws.lambda.CallbackFunction("api-get-example-handler", {
    role: lambdaRole.arn,
    callback: async (event: any) => {
        const id = decodeURIComponent(event.pathParameters?.id!);

        const client = new aws.sdk.DynamoDB.DocumentClient({ region: awsRegion });
        const item = await client.get({
            TableName: examplesTableName.get(),
            Key: {
                "id": id,
            },
            ProjectionExpression: "id, title, description, readme, program, stack, lastUpdate",
        }).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({
                ...item.Item,
            }),
        };
    },
});

const api = new awsx.classic.apigateway.API("api", {
    routes: [
        {
            path: "/examples",
            method: "POST",
            eventHandler: createExampleHandler,
            apiKeyRequired: true,
        },
        {
            path: "/examples",
            method: "GET",
            eventHandler: listExamplesHandler,
            apiKeyRequired: false,
        },
        {
            path: "/examples/{id}",
            method: "GET",
            eventHandler: getExampleHandler,
            apiKeyRequired: false,
        },
        {
            path: "/examples/{id}",
            method: "PUT",
            eventHandler: updateExampleHandler,
            apiKeyRequired: true,
        },
        {
            path: "/examples/{id}",
            method: "DELETE",
            eventHandler: deleteExampleHandler,
            apiKeyRequired: true,
        },
    ],
});

const key = new aws.apigateway.ApiKey("api-key", {
    value: apiKey,
});

const plan = new aws.apigateway.UsagePlan("examples-api-usage-plan", {
    apiStages: [
        {
            apiId: api.restAPI.id,
            stage: api.stage.stageName,
        },
    ],
});

const usagePlanKey = new aws.apigateway.UsagePlanKey("api-usage-plan-key", {
    keyId: key.id,
    keyType: "API_KEY",
    usagePlanId: plan.id,
});

export const apiURL = api.url;
