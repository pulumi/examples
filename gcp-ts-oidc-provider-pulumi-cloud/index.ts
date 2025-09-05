// Copyright 2025, Pulumi Corporation.  All rights reserved.

import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import * as pcloud from "@pulumi/pulumiservice";
import * as random from "@pulumi/random";

const config = new pulumi.Config();
const gcpConfig = new pulumi.Config("gcp");

const gcpProjectName = gcpConfig.require("project");

// In most cases, it's safe to assume that this stack is run in the same Pulumi
// org in which the OIDC environment is being configured. If not, set the
// escEnvOrg config to the name of the org where the environment is going to be
// configured.
const escEnvOrg = config.get("escEnvOrg") || pulumi.getOrganization();
const escEnvProject = config.get("escEnvProject") || `gcloud`;
const escEnvName = config.get("escEnvName") || `${gcpProjectName}-admin`;
const issuer = config.get("issuer") || "https://api.pulumi.com/oidc";

// We use a shorter name for the Workload Identity Pool and Service Account IDs
// because they have character limits of 30 and 32 respectively, and the Google
// Cloud project name is redundant in this context anyway, since we already know
// what Google Cloud project we are in:
const workloadIdentityPoolId = `${escEnvOrg}-admin`;
const serviceAccountId = workloadIdentityPoolId.replace("-", "");

const randomSuffix = new random.RandomString(`random-suffix`, {
  length: 5,
  lower: true,
  upper: false,
  special: false,
});

// The Workload Identity Pool id uses a random suffix so that this stack can be
// brought up and down repeatably: Workload Identity Pools only soft deletes and
// will auto-purge after 30 days. It is not possible to force a hard delete:
const identityPool = new gcp.iam.WorkloadIdentityPool(`identity-pool`, {
  workloadIdentityPoolId: pulumi.interpolate`${workloadIdentityPoolId}-${randomSuffix.result}`,
});

const oidcProvider = new gcp.iam.WorkloadIdentityPoolProvider(`identity-pool-provider`, {
  workloadIdentityPoolId: identityPool.workloadIdentityPoolId,
  workloadIdentityPoolProviderId: `pulumi-cloud-${pulumi.getOrganization()}-oidc`,
  oidc: {
    issuerUri: issuer,
    allowedAudiences: [`gcp:${pulumi.getOrganization()}`],
  },
  attributeMapping: {
    "google.subject": "assertion.sub",
  },
});

const enableIamCredsApi = new gcp.projects.Service("enableIamCredentialsApi", {
    service: "iamcredentials.googleapis.com",
    project: gcpProjectName,
});

const serviceAccount = new gcp.serviceaccount.Account("service-account", {
  accountId: serviceAccountId,
  project: gcpProjectName,
});

// tslint:disable-next-line:no-unused-expression
new gcp.projects.IAMMember("service-account", {
  member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
  role: "roles/admin",
  project: gcpProjectName,
});

// tslint:disable-next-line:no-unused-expression
new gcp.serviceaccount.IAMBinding("service-account", {
  serviceAccountId: serviceAccount.id,
  role: "roles/iam.workloadIdentityUser",
  members: [pulumi.interpolate`principalSet://iam.googleapis.com/${identityPool.name}/*`],
});

// fn::open::gcp-login requires project number instead of project name:
const projectNumber = gcp.projects.getProjectOutput({
  filter: `name:${gcpProjectName}`,
}).projects[0].number
  .apply(projectNumber => +projectNumber); // this casts it from string to a number

const envYaml = pulumi.interpolate`
values:
  gcp:
    login:
      fn::open::gcp-login:
        project: ${projectNumber}
        oidc:
          workloadPoolId: ${oidcProvider.workloadIdentityPoolId}
          providerId: ${oidcProvider.workloadIdentityPoolProviderId}
          serviceAccount: ${serviceAccount.email}
          subjectAttributes:
            - currentEnvironment.name
  pulumiConfig:
    gpc:project: \${gcp.login.project}
  environmentVariables:
    # The Google Cloud SDK (which is used by the Pulumi provider) requires the project to be set by number:
    GOOGLE_CLOUD_PROJECT: \${gcp.login.project}
    # The gcloud CLI requires the project be set by name, and via a different env var.
    # See: https://cloud.google.com/sdk/docs/properties#setting_properties_using_environment_variables
    CLOUDSDK_CORE_PROJECT: ${gcpProjectName}
    GOOGLE_OAUTH_ACCESS_TOKEN: \${gcp.login.accessToken}
    CLOUDSDK_AUTH_ACCESS_TOKEN: \${gcp.login.accessToken}
    USE_GKE_GCLOUD_AUTH_PLUGIN: True
`;

const environment = new pcloud.Environment("environment", {
  organization: escEnvOrg,
  project: escEnvProject,
  name: escEnvName,
  yaml: envYaml,
});


export const escEnvId = environment.id;
