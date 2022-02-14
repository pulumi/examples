import * as google from "@pulumi/google-native";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import * as config from "./config";

// Create a ServiceAccount
export const serviceAccount = new google.iam.v1.ServiceAccount(
  "appServiceAccount",
  {
    accountId: new random.RandomPet("serviceAccount", { length: 2 }).id,
    project: config.projectId,
  }
);

const existingPolicy = google.cloudresourcemanager.v1.getProjectIamPolicy({
  resource: config.projectId,
});
existingPolicy.then((p) => {
  const bindings = [
    {
      members: pulumi.all([
        pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
      ]),
      role: "roles/cloudsql.instanceUser",
    },
    {
      members: pulumi.all([
        pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
      ]),
      role: "roles/cloudsql.client",
    },
    {
      members: pulumi.all([
        pulumi.interpolate`serviceAccount:${config.projectId}.svc.id.goog[${config.k8sNamespace}/${config.k8sServiceAccountName}]`,
      ]),
      role: "roles/iam.workloadIdentityUser",
    },
  ];
  p.bindings.map((b) =>
    bindings.push({ members: pulumi.all(b.members), role: b.role })
  );
  // Update the bindings to include the service account
  new google.cloudresourcemanager.v1.ProjectIamPolicy("app-sa-policy", {
    bindings: bindings,
    resource: config.projectId,
  });
});
