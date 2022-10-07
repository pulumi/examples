// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

interface LambdaConfig {
    envvars: string[];
    secrets: pulumi.Output<string>[];
}

const config = new pulumi.Config();
const lambdaconfig = config.requireObject<LambdaConfig>("lambdawithsecrets");

const secretsArnArray: pulumi.Output<string>[] = new Array();
const secretArray: aws.secretsmanager.Secret[] = new Array();
for (const key in lambdaconfig.secrets) {
    if (lambdaconfig.secrets.hasOwnProperty(key)) {
        const secret = new aws.secretsmanager.Secret(`${key}`);
        const secretVersion = new aws.secretsmanager.SecretVersion(`secretversion-${key}`, {
            secretId: secret.id,
            secretString: lambdaconfig.secrets[key],
        });
        secretArray.push(secret);
        secretsArnArray[key.toLocaleUpperCase()] = secret.id;
    }
}

const role = new aws.iam.Role("roleLambdaWithSecrets", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(aws.iam.Principals.LambdaPrincipal),
});

const rpaBasic = new aws.iam.RolePolicyAttachment("rpa-basic", {
    role: role,
    policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
});



const secretManagerPolicyDoc = aws.iam.getPolicyDocumentOutput({
    statements: [
        {
            effect: "Allow",
            actions: [
                "secretsmanager:GetSecretValue",
            ],
            resources: secretArray.map(x => pulumi.interpolate`${x.arn}`),
        },
    ],
});

const secretManagerPolicy = new aws.iam.Policy("secretsPolicy", {
    policy: secretManagerPolicyDoc.apply(doc => doc.json),
});

const rpaSecrets = new aws.iam.RolePolicyAttachment("rpa-secrets", {
    role: role,
    policyArn: secretManagerPolicy.arn,
});

const lambdaEnvVars: pulumi.Input<{
    [key: string]: pulumi.Input<string>;
}> = {};

for (const key in secretsArnArray) {
    if (secretsArnArray.hasOwnProperty(key)) {
        lambdaEnvVars[key] = secretsArnArray[key];
    }
}

for (const key in lambdaconfig.envvars) {
    if (lambdaconfig.envvars.hasOwnProperty(key)) {
        lambdaEnvVars[key.toLocaleUpperCase()] = lambdaconfig.envvars[key];
    }
}

const lambda = new aws.lambda.Function("lambdaWithSecrets", {
    code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("./app"),
    }),
    role: role.arn,
    handler: "index.handler",
    runtime: aws.lambda.Runtime.NodeJS16dX,
    environment: {
        variables: lambdaEnvVars,
    },
    timeout: 15,
});

export const lambdaName = lambda.name;
