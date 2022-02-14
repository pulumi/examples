
import * as google from "@pulumi/google-native";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import * as config from "./config";


// Create a random suffix for the ServiceAccount.
const saSuffix = new random.RandomPet("saSuffix", {length: 2}).id;

// Create a ServiceAccount
export const serviceAccount = new google.iam.v1.ServiceAccount("appServiceAccount", {
    accountId: pulumi.interpolate`app-${saSuffix}`,
    project: config.project,
});

const existingPolicy = google.cloudresourcemanager.v1.getProjectIamPolicy({resource: config.project});
existingPolicy.then(p => {
    const bindings = [
        {
            members: pulumi.all([pulumi.interpolate `serviceAccount:${serviceAccount.email}`]),
            role: "roles/cloudsql.instanceUser",
        },
        {
            members: pulumi.all([pulumi.interpolate `serviceAccount:${serviceAccount.email}`]),
            role: "roles/cloudsql.client",
        },
        {
            members: pulumi.all([pulumi.interpolate`serviceAccount:${config.project}.svc.id.goog[default/${config.appServiceAccountName}]`]),
            role: "roles/iam.workloadIdentityUser",
        }
    ];
    p.bindings.map(b => bindings.push({members: pulumi.all(b.members), role: b.role}));
    // Update the bindings to include the service account
    new google.cloudresourcemanager.v1.ProjectIamPolicy("app-sa-policy", {
        bindings: bindings,
        resource: config.project,
    });
});
