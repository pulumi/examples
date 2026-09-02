// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { handle } from "./handler";

const secretsClient = new SecretsManagerClient({});

let cachedSecret: string | undefined;

async function loadDatabaseUrl(): Promise<string> {
    if (cachedSecret) {
        return cachedSecret;
    }
    const secretArn = process.env.SECRET_ARN;
    if (!secretArn) {
        throw new Error("SECRET_ARN env var is not set");
    }
    const response = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretArn }));
    if (!response.SecretString) {
        throw new Error("Secrets Manager returned an empty SecretString");
    }
    cachedSecret = response.SecretString;
    return cachedSecret;
}

(globalThis as unknown as { __resolveDbUrl?: () => Promise<string> }).__resolveDbUrl = loadDatabaseUrl;

type LambdaUrlEvent = {
    rawPath?: string;
    requestContext?: { http?: { path?: string } };
};

export async function handler(event: LambdaUrlEvent) {
    const path = event.rawPath ?? event.requestContext?.http?.path ?? "/";
    const result = await handle(path);
    return {
        statusCode: result.status,
        body: result.body,
        headers: result.headers,
    };
}
