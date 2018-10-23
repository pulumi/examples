import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

// Minikube does not implement services of type `LoadBalancer`; require the user to specify if we're
// running on minikube, and if so, create only services of type ClusterIP.
let config = new pulumi.Config();
if (config.require("isMinikube") === "true") {
    throw new Error("This example does not yet support minikube");
}

// Deploy the latest version of the stable/wordpress chart.
const wordpress = new k8s.helm.v2.Chart("wpdev", {
    repo: "stable",
    version: "2.1.3",
    chart: "wordpress",
    values: {
        // NOTE: These are required, as Helm will re-generate these passwords every time. See:
        // helm/charts#5167.
        wordpressPassword: config.require("wordpressPassword"),
        mariadb: {
            db: { password: config.require("mariadbPassword") },
            rootUser: { password: config.require("mariadbRootPassword") }
        }
    }
});

// Export the public IP for Wordpress.
const frontend = wordpress.getResource("v1/Service", "wpdev-wordpress");
export const frontendIp = frontend.status.apply(status => status.loadBalancer.ingress[0].ip);
