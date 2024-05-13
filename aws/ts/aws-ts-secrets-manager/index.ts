// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";

// Create a secret
const secret = new aws.secretsmanager.Secret("secret");

// Store a new secret version
const secretVersion = new aws.secretsmanager.SecretVersion("secretVersion", {
    secretId: secret.id,
    secretString: "mysecret",
});

// Export secret ID (in this case the ARN)
export const secretId = secret.id;
