// Copyright 2024, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as pulumiservice from "@pulumi/pulumiservice";
import * as tls from "@pulumi/tls";

// Configurations
const audience = pulumi.getOrganization();
const config = new pulumi.Config();
const oidcIdpUrl: string = config.get("oidcIdpUrl") || "https://api.pulumi.com/oidc";
const escEnv: string = config.require("escEnv");

// Get TLS thumbprint for OIDC Provider
const certs = tls.getCertificateOutput({
    url: oidcIdpUrl,
});

const thumbprint = certs.certificates[0].sha1Fingerprint;

// Create a new OIDC Provider
const oidcProvider = new aws.iam.OpenIdConnectProvider("oidcProvider", {
    clientIdLists: [audience],
    url: oidcIdpUrl,
    thumbprintLists: [thumbprint],
}, {
    protect: true,
});

// Create a new role that can be assumed by the OIDC provider
const role = new aws.iam.Role("oidcProviderRole", {
    assumeRolePolicy: pulumi.all([oidcProvider.url, oidcProvider.arn, audience]).apply(([url, arn, audience]) => JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Principal: { Federated: arn },
            Action: "sts:AssumeRoleWithWebIdentity",
            Condition: { StringEquals: { [`${url}:aud`]: [audience] } },
        }],
    })),
});

// Get the existing AdministratorAccess policy
const existingPolicy = aws.iam.getPolicy({
    arn: "arn:aws:iam::aws:policy/AdministratorAccess",
});


// Attach other policies to the role as needed
const attach = new aws.iam.RolePolicyAttachment("oidcProviderRolePolicyAttachment", {
    role: role,
    policyArn: existingPolicy.then(policy => policy.arn),
});


if (escEnv === ".") {
    console.log("Skipping ESC Environment creation ...");
}
else {
    const envJson = pulumi.jsonStringify({
        "values": {
            "aws": {
                "login": {
                    "fn::open::aws-login": {
                        "oidc": {
                            "duration": "1h",
                            "roleArn": role.arn,
                            "sessionName": "pulumi-environments-session",
                        },
                    },
                },
            },
            "environmentVariables": {
                "AWS_ACCESS_KEY_ID": "${aws.login.accessKeyId}",
                "AWS_SECRET_ACCESS_KEY": "${aws.login.secretAccessKey}",
                "AWS_SESSION_TOKEN": "${aws.login.sessionToken}",
            },
        },
    });

    const envAsset = envJson.apply(json => new pulumi.asset.StringAsset(json));

    const env = new pulumiservice.Environment("oidcEnvironment", {
        name: escEnv,
        organization: audience,
        yaml: envAsset,
    });

} // end of else
