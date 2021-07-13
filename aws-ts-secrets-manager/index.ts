import * as aws from "@pulumi/aws";

const secretContainer = new aws.secretsmanager.Secret("secretContainer");

const secret = new aws.secretsmanager.SecretVersion("secret", {
    secretId: secretContainer.id,
    secretString: "mysecret",
});

export const secretContainerId = secretContainer.id;