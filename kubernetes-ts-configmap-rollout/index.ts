import * as fs from "fs";
import * as pulumi from "@pulumi/pulumi";
import { policy } from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as outputs from "@pulumi/kubernetes/types/output";

const appName = "nginx";
const appLabels = { app: appName };

// nginx Configuration data to proxy traffic to `pulumi.github.io`. Read from
// `default.conf` file.
const nginxConfig = new k8s.core.v1.ConfigMap(appName, {
    metadata: { labels: appLabels },
    data: { "default.conf": fs.readFileSync("default.conf").toString() },
});
const nginxConfigName = nginxConfig.metadata.apply(m => m.name);

// Deploy 1 nginx replica, mounting the configuration data into the nginx
// container.
const nginx = new k8s.apps.v1beta1.Deployment(appName, {
    metadata: { labels: appLabels },
    spec: {
        replicas: 1,
        template: {
            metadata: { labels: appLabels },
            spec: {
                containers: [
                    {
                        image: "nginx:1.13.6-alpine",
                        name: "nginx",
                        volumeMounts: [{ name: "nginx-configs", mountPath: "/etc/nginx/conf.d" }],
                    },
                ],
                volumes: [{ name: "nginx-configs", configMap: { name: nginxConfigName } }],
            },
        },
    },
});

// Expose proxy to the public Internet.
const frontend = new k8s.core.v1.Service(appName, {
    metadata: { labels: nginx.spec.apply(spec => spec.template.metadata.labels) },
    spec: {
        type: "LoadBalancer",
        ports: [{ port: 80, targetPort: 80, protocol: "TCP" }],
        selector: appLabels,
    },
});

const message = `Services where \`.spec.type\` is set to 'LoadBalancer' will cause
the underlying cloud provider to spin up a managed load balancer. This is both
costly and insecure, as it will cause a public IP address to be allocated to
the Service. You should use one of Ingress objects that is already provisioned
instead.`;

// Define an admission policy.
const noLoadBalancers: policy.AdmissionPolicy = {
    description: "Disallow Services with type LoadBalancer`",
    tags: [policy.Tags.Cost, policy.Tags.Security],
    enforcementLevel: policy.EnforcementLevel.SoftMandatory,
    message: message,
    rule: (inputs: outputs.core.v1.Service) => inputs.spec.type == "LoadBalancer",
};

k8s.core.v1.Service.addAdmissionPolicy(noLoadBalancers);
