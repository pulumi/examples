import * as aws from "@pulumi/aws";

// Create a secret
const secret = new aws.secretsmanager.Secret("secretContainer");

// Store a new secret version
const secretVersion = new aws.secretsmanager.SecretVersion("secret", {
    secretId: secret.id,
    secretString: "mysecret",
});

// Export secret ID (in this case the ARN)
export const secretId = secret.id;