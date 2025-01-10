package gcpgke;

import com.pulumi.Context;
import com.pulumi.Pulumi;
import com.pulumi.core.Output;
import com.pulumi.gcp.container.Cluster;
import com.pulumi.gcp.container.ClusterArgs;
import com.pulumi.gcp.container.ContainerFunctions;
import com.pulumi.gcp.container.NodePool;
import com.pulumi.gcp.container.NodePoolArgs;
import com.pulumi.gcp.container.inputs.NodePoolManagementArgs;
import com.pulumi.gcp.container.inputs.NodePoolNodeConfigArgs;
import com.pulumi.gcp.container.outputs.GetEngineVersionsResult;
import com.pulumi.kubernetes.Provider;
import com.pulumi.kubernetes.ProviderArgs;
import com.pulumi.kubernetes.apps.v1.Deployment;
import com.pulumi.kubernetes.apps.v1.DeploymentArgs;
import com.pulumi.kubernetes.apps.v1.inputs.DeploymentSpecArgs;
import com.pulumi.kubernetes.core.v1.Namespace;
import com.pulumi.kubernetes.core.v1.NamespaceArgs;
import com.pulumi.kubernetes.core.v1.Service;
import com.pulumi.kubernetes.core.v1.ServiceArgs;
import com.pulumi.kubernetes.core.v1.enums.ServiceSpecType;
import com.pulumi.kubernetes.core.v1.inputs.ContainerArgs;
import com.pulumi.kubernetes.core.v1.inputs.ContainerPortArgs;
import com.pulumi.kubernetes.core.v1.inputs.PodSpecArgs;
import com.pulumi.kubernetes.core.v1.inputs.PodTemplateSpecArgs;
import com.pulumi.kubernetes.core.v1.inputs.ServicePortArgs;
import com.pulumi.kubernetes.core.v1.inputs.ServiceSpecArgs;
import com.pulumi.kubernetes.meta.v1.inputs.LabelSelectorArgs;
import com.pulumi.kubernetes.meta.v1.inputs.ObjectMetaArgs;
import com.pulumi.resources.CustomResourceOptions;

import java.text.MessageFormat;
import java.util.Map;

public class App {
    public static void main(String[] args) {
        Pulumi.run(App::stack);
    }

    private static void stack(Context ctx) {
        final String name = "helloworld";

        final var masterVersion = ctx.config().get("masterVersion").map(Output::of)
            .orElseGet(() -> ContainerFunctions.getEngineVersions()
                       .applyValue(versions -> versions.latestMasterVersion()));

        ctx.export("masterVersion", masterVersion);

        // Create a GKE cluster
        // We can't create a cluster with no node pool defined, but we want to only use
        // separately managed node pools. So we create the smallest possible default
        // node pool and immediately delete it.
        final var cluster = new Cluster(name,
                ClusterArgs.builder().initialNodeCount(1)
                        .removeDefaultNodePool(true)
                        .minMasterVersion(masterVersion)
                        .build()
        );

        final var nodePool = new NodePool("primary-node-pool",
                NodePoolArgs.builder()
                        .cluster(cluster.name())
                        .location(cluster.location())
                        .version(masterVersion)
                        .initialNodeCount(2)
                        .nodeConfig(NodePoolNodeConfigArgs.builder()
                                .preemptible(true)
                                .machineType("n1-standard-1")
                                .oauthScopes(
                                        "https://www.googleapis.com/auth/compute",
                                        "https://www.googleapis.com/auth/devstorage.read_only",
                                        "https://www.googleapis.com/auth/logging.write",
                                        "https://www.googleapis.com/auth/monitoring"
                                )
                                .build()
                        )
                        .management(NodePoolManagementArgs.builder()
                                .autoRepair(true)
                                .build()
                        )
                        .build(),
                CustomResourceOptions.builder()
                        .dependsOn(cluster)
                        .build());
        ctx.export("clusterName", cluster.name());

        // Manufacture a GKE-style kubeconfig. Note that this is slightly "different"
        // because of the way GKE requires gcloud to be in the picture for cluster
        // authentication (rather than using the client cert/key directly).
        final var gcpConfig = new com.pulumi.gcp.Config();
        var clusterName = String.format("%s_%s_%s",
                gcpConfig.project().orElseThrow(),
                gcpConfig.zone().orElseThrow(),
                name
        );

        var masterAuthClusterCaCertificate = cluster.masterAuth()
                .applyValue(a -> a.clusterCaCertificate().orElseThrow());

        var yamlTemplate = """
apiVersion: v1,
clusters:,
- cluster:,
    certificate-authority-data: {2},
    server: https://{1},
  name: {0},
contexts:,
- context:,
    cluster: {0},
    user: {0},
  name: {0},
current-context: {0},
kind: Config,
preferences: '{}',
users:,
- name: {0},
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: gke-gcloud-auth-plugin
      installHint: Install gke-gcloud-auth-plugin for use with kubectl by following
        https://cloud.google.com/blog/products/containers-kubernetes/kubectl-auth-changes-in-gke
      provideClusterInfo: true
            """;

        var kubeconfig = cluster.endpoint()
                .apply(endpoint -> masterAuthClusterCaCertificate.applyValue(
                        caCert -> MessageFormat.format(yamlTemplate, clusterName, endpoint, caCert)));

        ctx.export("kubeconfig", kubeconfig);

        // Create a Kubernetes provider instance that uses our cluster from above.
        final var clusterProvider = new Provider(name,
                ProviderArgs.builder()
                        .kubeconfig(kubeconfig)
                        .build(),
                CustomResourceOptions.builder()
                        .dependsOn(nodePool, cluster)
                        .build()
        );
        final var clusterResourceOptions = CustomResourceOptions.builder()
                .provider(clusterProvider)
                .build();

        // Create a Kubernetes Namespace
        final var ns = new Namespace(name,
                NamespaceArgs.Empty,
                clusterResourceOptions
        );

        // Export the Namespace name
        var namespaceName = ns.metadata()
                .applyValue(m -> m.name().orElseThrow());

        ctx.export("namespaceName", namespaceName);

        final var appLabels = Map.of("appClass", name);

        final var metadata = ObjectMetaArgs.builder()
                .namespace(namespaceName)
                .labels(appLabels)
                .build();

        // Create a NGINX Deployment
        final var deployment = new Deployment(name, DeploymentArgs.builder()
                .metadata(metadata)
                .spec(DeploymentSpecArgs.builder()
                        .replicas(1)
                        .selector(LabelSelectorArgs.builder()
                                .matchLabels(appLabels)
                                .build())
                        .template(PodTemplateSpecArgs.builder()
                                .metadata(metadata)
                                .spec(PodSpecArgs.builder()
                                        .containers(ContainerArgs.builder()
                                                .name(name)
                                                .image("nginx:latest")
                                                .ports(ContainerPortArgs.builder()
                                                        .name("http")
                                                        .containerPort(80)
                                                        .build())
                                                .build())
                                        .build())
                                .build())
                        .build())
                .build(), clusterResourceOptions);

        // Export the Deployment name
        ctx.export("deploymentName", deployment.metadata()
                .applyValue(m -> m.name().orElseThrow()));

        // Create a LoadBalancer Service for the NGINX Deployment
        final var service = new Service(name, ServiceArgs.builder()
                .metadata(metadata)
                .spec(ServiceSpecArgs.builder()
                        .type(Output.ofRight(ServiceSpecType.LoadBalancer))
                        .ports(ServicePortArgs.builder()
                                .port(80)
                                .targetPort(Output.ofRight("http"))
                                .build())
                        .selector(appLabels)
                        .build())
                .build(), clusterResourceOptions);

        // Export the Service name and public LoadBalancer endpoint
        ctx.export("serviceName", service.metadata()
                .applyValue(m -> m.name().orElseThrow()));

        ctx.export("servicePublicIP", service.status()
                .applyValue(s -> s.orElseThrow().loadBalancer().orElseThrow())
                .applyValue(status -> status.ingress().get(0).ip().orElseThrow()));
    }
}
