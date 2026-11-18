// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as gcp from "@pulumi/gcp";
import * as pcloud from "@pulumi/pulumiservice";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

const config = new pulumi.Config();
const gcpConfig = new pulumi.Config("gcp");

const gcpProjectName = gcpConfig.require("project");

// In most cases, it's safe to assume that this stack is run in the same Pulumi
// org in which the OIDC environment is being configured. If not, set the
// escEnvOrg config to the name of the org where the environment is going to be
// configured.
const escEnvOrg = config.get("escEnvOrg") || pulumi.getOrganization();
const escEnvProject = config.get("escEnvProject") || "gcloud";
const escEnvName = config.get("escEnvName") || `${gcpProjectName}-admin`;
const issuer = config.get("issuer") || "https://api.pulumi.com/oidc";

// We use a shorter name for the Workload Identity Pool and Service Account IDs
// because they have character limits of 30 and 32 respectively, and the Google
// Cloud project name is redundant in this context anyway, since we already know
// what Google Cloud project we are in:
const workloadIdentityPoolId = `${escEnvOrg}-admin`;
const serviceAccountId = workloadIdentityPoolId.replace("-", "");

const randomSuffix = new random.RandomString("random-suffix", {
  length: 5,
  lower: true,
  upper: false,
  special: false,
});

// The Workload Identity Pool id uses a random suffix so that this stack can be
// brought up and down repeatably: Workload Identity Pools only soft deletes and
// will auto-purge after 30 days. It is not possible to force a hard delete:
const identityPool = new gcp.iam.WorkloadIdentityPool("identity-pool", {
  workloadIdentityPoolId: pulumi.interpolate`${workloadIdentityPoolId}-${randomSuffix.result}`,
});

const oidcProvider = new gcp.iam.WorkloadIdentityPoolProvider("identity-pool-provider", {
  workloadIdentityPoolId: identityPool.workloadIdentityPoolId,
  workloadIdentityPoolProviderId: `pulumi-cloud-${escEnvOrg}-oidc`,
  oidc: {
    issuerUri: issuer,
    allowedAudiences: [`gcp:${escEnvOrg}`],
  },
  attributeMapping: {
    "google.subject": "assertion.sub",
  },
});

const enableIamCredsApi = new gcp.projects.Service("enableIamCredentialsApi", {
  service: "iamcredentials.googleapis.com",
  project: gcpProjectName,
}, { retainOnDelete: true });

const serviceAccount = new gcp.serviceaccount.Account("service-account", {
  accountId: serviceAccountId,
  project: gcpProjectName,
});

new gcp.projects.IAMMember("service-account", {
  member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
  role: "roles/admin",
  project: gcpProjectName,
});

new gcp.serviceaccount.IAMBinding("service-account", {
  serviceAccountId: serviceAccount.id,
  role: "roles/iam.workloadIdentityUser",
  members: [pulumi.interpolate`principalSet://iam.googleapis.com/${identityPool.name}/*`],
});

// fn::open::gcp-login requires the project number instead of the project ID.
// Its `project` output is that same number, which some Google APIs reject as a
// default project, so the settings below use the project ID instead:
const projectNumber = gcp.projects.getProjectOutput({
  filter: `id:${gcpProjectName}`,
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
    gcp:project: ${gcpProjectName}
  environmentVariables:
    # Used by Pulumi Cloud account scans and Terraform:
    GOOGLE_PROJECT: ${gcpProjectName}
    # Used by the Google Cloud client libraries:
    GOOGLE_CLOUD_PROJECT: ${gcpProjectName}
    # The gcloud CLI reads the project from a different env var.
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
