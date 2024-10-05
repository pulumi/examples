// Copyright 2024, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as command from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";
import * as pulumiservice from "@pulumi/pulumiservice";
import * as tls from "@pulumi/tls";

const config = new pulumi.Config();
const escProject = config.require("escProject");

const pulumiOrg = pulumi.getOrganization();

// NOTE: At the time of writing, if you are still using the legacy "default"
// organization, the format for the audience OIDC claim is different. Best
// practice is to avoid using the legacy default project.
const oidcAudience = escProject == "default" ? pulumiOrg : `aws:${pulumiOrg}`;

const oidcIdpUrl: string = "https://api.pulumi.com/oidc";

const certs = tls.getCertificateOutput({
    url: oidcIdpUrl,
});

const thumbprint = certs.certificates[0].sha1Fingerprint;

function getProviderArn() {
    const existingProvider = aws.iam.getOpenIdConnectProviderOutput({
        url: oidcIdpUrl,
    });

    if (existingProvider) {
        console.log("OIDC Provider already exists. Adding current Pulumi org as an audience to the existing provider.");

        new command.local.Command("oidc-client-id", {
            create: pulumi.interpolate`aws iam add-client-id-to-open-id-connect-provider --open-id-connect-provider-arn ${existingProvider.arn} --client-id ${oidcAudience}`,
            delete: pulumi.interpolate`aws iam remove-client-id-from-open-id-connect-provider --open-id-connect-provider-arn ${existingProvider.arn} --client-id ${oidcAudience}`,
        });
        return existingProvider.arn;
    } else {
        const provider = new aws.iam.OpenIdConnectProvider("oidcProvider", {
            clientIdLists: [pulumiOrg],
            url: oidcIdpUrl,
            thumbprintLists: [thumbprint],
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
            values: [oidcAudience],
        }],
    }],
}));

const role = new aws.iam.Role("pulumi-cloud-admin", {
    assumeRolePolicy: policyDocument.json,
});

new aws.iam.RolePolicyAttachment("policy", {
    policyArn: "arn:aws:iam::aws:policy/AdministratorAccess",
    role: role.name,
});

export const envYaml = pulumi.interpolate`
values:
  aws:
    login:
      fn::open::aws-login:
        oidc:
          duration: 1h
          roleArn: ${role.arn}
          sessionName: pulumi-esc
  environmentVariables:
    AWS_ACCESS_KEY_ID: \${aws.login.accessKeyId}
    AWS_SECRET_ACCESS_KEY: \${aws.login.secretAccessKey}
    AWS_SESSION_TOKEN: \${aws.login.sessionToken}
`;

new pulumiservice.Environment("aws-oidc-admin", {
    organization: pulumiOrg,
    project: escProject,
    name: "aws-oidc-admin",
    yaml: envYaml.apply(yaml => new pulumi.asset.StringAsset(yaml)),
});
