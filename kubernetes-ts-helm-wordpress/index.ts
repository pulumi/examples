import * as k8s from "@pulumi/kubernetes";

// Deploy the latest version of the stable/wordpress chart.
const wordpress = new k8s.helm.v2.Chart("wpdev", {
    repo: "stable",
    version: "2.1.3",
    chart: "wordpress"
});

// Export the public IP for Wordpress.
const frontend = wordpress.getResource("v1/Service", "wpdev-wordpress");
export const frontendIp = frontend.status.apply(status => status.loadBalancer.ingress[0].ip);
