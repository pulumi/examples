// Copyright 2024, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as command from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";
import * as pulumiservice from "@pulumi/pulumiservice";
import * as tls from "@pulumi/tls";

// Configurations
const audience = pulumi.getOrganization();
const oidcIdpUrl: string = "https://api.pulumi.com/oidc";

// Get TLS thumbprint for OIDC Provider
const certs = tls.getCertificateOutput({
    url: oidcIdpUrl,
});
const thumbprint = certs.certificates[0].sha1Fingerprint;

function getProviderArn() {
    const existingProvider = aws.iam.getOpenIdConnectProviderOutput({
        url: oidcIdpUrl,
    });
    if (existingProvider) {
        console.log("OIDC Provider already exists ...");
        // upsert audience
        const cmd = new command.local.Command("oidc-client-id", {
            create: pulumi.interpolate`aws iam add-client-id-to-open-id-connect-provider --open-id-connect-provider-arn ${existingProvider.arn} --client-id aws:${audience}`,
            delete: pulumi.interpolate`aws iam remove-client-id-from-open-id-connect-provider --open-id-connect-provider-arn ${existingProvider.arn} --client-id aws:${audience}`,
        });
        return existingProvider.arn;
    } else {
        console.log("Creating OIDC Provider ...");
        const provider = new aws.iam.OpenIdConnectProvider("oidcProvider", {
            clientIdLists: [audience],
            url: oidcIdpUrl,
            thumbprintLists: [thumbprint],
        }, {
            protect: true,
        });
        return provider.arn;
    }
}

export const arn: pulumi.Output<string> = getProviderArn();

const policyDocument = arn.apply(arn => aws.iam.getPolicyDocument({
    version: "2012-10-17",
    statements: [{
        effect: "Allow",
        actions: ["sts:AssumeRoleWithWebIdentity"],
        principals: [{
            type: "Federated",
            identifiers: [arn],
        }],
        conditions: [{
            test: "StringEquals",
            variable: `api.pulumi.com/oidc:aud`,
            values: [`aws:${audience}`], // new format
        }],
    }],
}));

// // Create a new role that can be assumed by the OIDC provider
const role = new aws.iam.Role("role", {
    assumeRolePolicy: policyDocument.json,
});

// Attach the AWS managed policy "AdministratorAccess" to the role.
const rpa = new aws.iam.RolePolicyAttachment("policy", {
    policyArn: "arn:aws:iam::aws:policy/AdministratorAccess",
    role: role.name,
});

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

// Create a new environment
const env = new pulumiservice.Environment("aws-oidc-admin", {
    name: "test",
    // project: "auth", // post esc-GA
    organization: audience,
    yaml: envAsset,
});
