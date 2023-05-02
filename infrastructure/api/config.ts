import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();

// The API Gateway API key to be used for securing the examples API.
export const apiKey = config.requireSecret("apiKey");

// The GitHub access token to be used for making authenticated calls to GitHub (e.g., to trigger workflows).
const gitHubToken = config.requireSecret("gitHubToken");

// The AWS provider config.
const providerConfig = new pulumi.Config("aws");
export const awsRegion = providerConfig.require("region");
export const awsAccountID = pulumi.output(aws.getCallerIdentity()).accountId;

// Store the GitHub access in AWS Secrets Manager to reference it safely in Lambdas.
const gitHubTokenSecret = new aws.secretsmanager.Secret("github-token-secret");
const gitHubTokenSecretVersion = new aws.secretsmanager.SecretVersion("github-token-secret-version", {
    secretId: gitHubTokenSecret.id,
    secretString: gitHubToken,
});

export const gitHubTokenSecretID = gitHubTokenSecret.id;
