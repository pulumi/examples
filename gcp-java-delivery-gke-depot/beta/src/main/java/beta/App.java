// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

package beta;

import com.google.gson.GsonBuilder;
import com.pulumi.Context;
import com.pulumi.Pulumi;
import com.pulumi.core.Output;
import com.pulumi.gcp.container.Cluster;
import com.pulumi.gcp.container.ClusterArgs;
import com.pulumi.gcp.organizations.OrganizationsFunctions;
import com.pulumi.kubernetes.Provider;
import com.pulumi.kubernetes.ProviderArgs;
import com.pulumi.kubernetes.apps.v1.Deployment;
import com.pulumi.kubernetes.apps.v1.DeploymentArgs;
import com.pulumi.kubernetes.apps.v1.inputs.DeploymentSpecArgs;
import com.pulumi.kubernetes.core.v1.Service;
import com.pulumi.kubernetes.core.v1.ServiceArgs;
import com.pulumi.kubernetes.core.v1.enums.ServiceSpecType;
import com.pulumi.kubernetes.core.v1.inputs.ContainerArgs;
import com.pulumi.kubernetes.core.v1.inputs.ContainerPortArgs;
import com.pulumi.kubernetes.core.v1.inputs.HTTPGetActionArgs;
import com.pulumi.kubernetes.core.v1.inputs.PodSpecArgs;
import com.pulumi.kubernetes.core.v1.inputs.PodTemplateSpecArgs;
import com.pulumi.kubernetes.core.v1.inputs.ProbeArgs;
import com.pulumi.kubernetes.core.v1.inputs.ResourceRequirementsArgs;
import com.pulumi.kubernetes.core.v1.inputs.ServicePortArgs;
import com.pulumi.kubernetes.core.v1.inputs.ServiceSpecArgs;
import com.pulumi.kubernetes.meta.v1.inputs.LabelSelectorArgs;
import com.pulumi.kubernetes.meta.v1.inputs.ObjectMetaArgs;
import com.pulumi.resources.CustomResourceOptions;
import java.util.List;
import java.util.Map;

public class App {
    public static void main(String[] args) {
        Pulumi.run(App::stack);
    }

    private static void stack(Context ctx) {
        // Set by the pipeline from the image stack's output: the app image,
        // pinned by digest.
        var imageRef = ctx.config().require("imageRef");
        var region = ctx.config("gcp").require("region");

        // Autopilot manages the nodes, so the cluster needs no node pool.
        var cluster = new Cluster("cluster", ClusterArgs.builder()
            .location(region)
            .enableAutopilot(true)
            // Lets `pulumi destroy` delete the cluster.
            .deletionProtection(false)
            .build());

        // Authenticate to the cluster with the stack's own short-lived GCP
        // access token. The usual GKE kubeconfig runs gke-gcloud-auth-plugin,
        // which the Delivery runner does not have.
        var caCertificate = cluster.masterAuth()
            .applyValue(auth -> auth.clusterCaCertificate().orElseThrow());
        var accessToken = OrganizationsFunctions.getClientConfig()
            .applyValue(c -> c.accessToken());
        var kubeconfig = Output.tuple(cluster.endpoint(), caCertificate, accessToken)
            .applyValue(t -> kubeconfig(t.t1, t.t2, t.t3))
            .asSecret();

        var provider = new Provider("gke", ProviderArgs.builder()
            .kubeconfig(kubeconfig)
            .build());
        var onCluster = CustomResourceOptions.builder().provider(provider).build();

        var labels = Map.of("app", "app");
        var port = 8080;

        var container = ContainerArgs.builder()
            .name("app")
            .image(imageRef)
            .ports(ContainerPortArgs.builder().name("http").containerPort(port).build())
            // Autopilot bills by these requests.
            .resources(ResourceRequirementsArgs.builder()
                .requests(Map.of("cpu", "250m", "memory", "512Mi"))
                .build())
            .readinessProbe(ProbeArgs.builder()
                .httpGet(HTTPGetActionArgs.builder().path("/").port(port).build())
                .build())
            .build();

        var podTemplate = PodTemplateSpecArgs.builder()
            .metadata(ObjectMetaArgs.builder().labels(labels).build())
            .spec(PodSpecArgs.builder().containers(container).build())
            .build();

        new Deployment("app", DeploymentArgs.builder()
            .spec(DeploymentSpecArgs.builder()
                .replicas(1)
                .selector(LabelSelectorArgs.builder().matchLabels(labels).build())
                .template(podTemplate)
                .build())
            .build(), onCluster);

        // Pulumi waits for the load balancer to get an external IP.
        var service = new Service("app", ServiceArgs.builder()
            .spec(ServiceSpecArgs.builder()
                .type(ServiceSpecType.LoadBalancer)
                .selector(labels)
                .ports(ServicePortArgs.builder()
                    .port(80)
                    .targetPort("http")
                    .build())
                .build())
            .build(), onCluster);

        ctx.export("url", service.status().applyValue(status -> status
            .flatMap(s -> s.loadBalancer())
            .flatMap(lb -> lb.ingress().stream().findFirst())
            .flatMap(ingress -> ingress.ip())
            .map(ip -> "http://" + ip)
            .orElseThrow(() -> new IllegalStateException("the Service has no load balancer IP"))));
    }

    // A kubeconfig with a single cluster, user and context. JSON is valid
    // YAML, so the Kubernetes provider reads it like any other kubeconfig.
    static String kubeconfig(String endpoint, String caCertificate, String token) {
        var name = "gke";
        // Gson escapes "=" by default; keep the base64 padding readable.
        var gson = new GsonBuilder().disableHtmlEscaping().create();
        return gson.toJson(Map.of(
            "apiVersion", "v1",
            "kind", "Config",
            "clusters", List.of(Map.of(
                "name", name,
                "cluster", Map.of(
                    "server", "https://" + endpoint,
                    "certificate-authority-data", caCertificate))),
            "users", List.of(Map.of(
                "name", name,
                "user", Map.of("token", token))),
            "contexts", List.of(Map.of(
                "name", name,
                "context", Map.of("cluster", name, "user", name))),
            "current-context", name));
    }
}
