import * as k8s from "@pulumi/kubernetes";

import { k8sProvider, k8sConfig } from "./cluster";
import { kubeInject, istio } from "./istio";

// Export the Kubeconfig so that clients can easily access our cluster.
export const kubeConfig = k8sConfig;
export const i = istio.urn;

const bookinfo = new k8s.yaml.ConfigGroup(
    "yaml/bookinfo.yaml",
    { yaml: kubeInject("yaml/bookinfo.yaml") },
    { dependsOn: istio, providers: { kubernetes: k8sProvider } }
);

new k8s.yaml.ConfigFile("yaml/bookinfo-gateway.yaml", undefined, {
    dependsOn: bookinfo,
    providers: { kubernetes: k8sProvider }
});

export const frontendIp = istio
    .getResource("v1/Service", "istio-system/istio-ingressgateway")
    .apply(s => s.status.apply(s => `${s.loadBalancer.ingress[0].ip}/productpage`));
