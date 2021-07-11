import * as container from "@pulumi/google-native/container/v1beta1";
import * as pulumi from "@pulumi/pulumi";

// Generate a GKE-style kubeconfig. Note that this is slightly "different"
// because of the way GKE requires gcloud to be in the picture for cluster
// authentication (rather than using the client cert/key directly).
export function generate(project: string, cluster: container.Cluster): pulumi.Output<string> {
    const context = pulumi.interpolate `${project}_${cluster.location}_${cluster.name}`;
    return pulumi.all([cluster.endpoint, cluster.masterAuth, context]).
    apply(([endpoint, masterAuth, context]) => {
        return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${masterAuth.clusterCaCertificate}
    server: https://${endpoint}
  name: ${context}
contexts:
- context:
    cluster: ${context}
    user: ${context}
  name: ${context}
current-context: ${context}
kind: Config
preferences: {}
users:
- name: ${context}
  user:
    auth-provider:
      config:
        cmd-args: config config-helper --format=json
        cmd-path: gcloud
        expiry-key: '{.credential.token_expiry}'
        token-key: '{.credential.access_token}'
      name: gcp
`;
    });
}