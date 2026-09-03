// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface AiAppArgs {
    /** Prefix applied to the names of the resources this component creates. */
    namePrefix: string;
    /** The Amazon Bedrock foundation model ID the function invokes. */
    modelId: string;
    /** Tags applied to every resource that supports them. */
    tags?: Record<string, string>;
}

/**
 * AiApp provisions a serverless inference endpoint backed by Amazon Bedrock: a
 * Lambda function (with a public Function URL) that invokes a Bedrock foundation
 * model, scoped down to just `bedrock:InvokeModel` on the configured model.
 */
export class AiApp extends pulumi.ComponentResource {
    public readonly endpointUrl: pulumi.Output<string>;
    public readonly logResource: pulumi.Output<string>;
    public readonly runtimeIdentity: pulumi.Output<string>;

    constructor(name: string, args: AiAppArgs, opts?: pulumi.ComponentResourceOptions) {
        super("examples:aiAppInfrastructure:AwsBedrock", name, {}, opts);
        const parent = { parent: this };
        const tags = args.tags;
        const functionName = `${args.namePrefix}-ai`;

        const logGroup = new aws.cloudwatch.LogGroup(`${name}-logs`, {
            name: `/aws/lambda/${functionName}`,
            retentionInDays: 14,
            tags,
        }, parent);

        const role = new aws.iam.Role(`${name}-role`, {
            assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" }),
            tags,
        }, parent);

        new aws.iam.RolePolicyAttachment(`${name}-basic`, {
            role: role.name,
            policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
        }, parent);

        // Allow the function to invoke only the configured Bedrock model.
        const modelArn = pulumi.interpolate`arn:aws:bedrock:${aws.config.region}:*:foundation-model/${args.modelId}`;
        new aws.iam.RolePolicy(`${name}-bedrock`, {
            role: role.id,
            policy: pulumi.jsonStringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Action: "bedrock:InvokeModel",
                    Resource: modelArn,
                }],
            }),
        }, parent);

        const fn = new aws.lambda.Function(`${name}-function`, {
            name: functionName,
            role: role.arn,
            runtime: aws.lambda.Runtime.NodeJS20dX,
            handler: "index.handler",
            timeout: 60,
            memorySize: 512,
            code: new pulumi.asset.FileArchive("lambda"),
            environment: { variables: { MODEL_ID: args.modelId } },
            tags,
        }, { ...parent, dependsOn: [logGroup] });

        const url = new aws.lambda.FunctionUrl(`${name}-url`, {
            functionName: fn.name,
            authorizationType: "NONE",
            cors: {
                allowOrigins: ["*"],
                allowMethods: ["POST"],
                allowHeaders: ["content-type"],
            },
        }, parent);

        this.endpointUrl = url.functionUrl;
        this.logResource = logGroup.name;
        this.runtimeIdentity = role.arn;

        this.registerOutputs({
            endpointUrl: this.endpointUrl,
            logResource: this.logResource,
            runtimeIdentity: this.runtimeIdentity,
        });
    }
}
