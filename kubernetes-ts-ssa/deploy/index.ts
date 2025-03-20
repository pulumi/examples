import * as k8s from "@pulumi/kubernetes";

const appLabels = { app: "nginx" };
const deployment = new k8s.apps.v1.Deployment("nginx", {
    metadata: {
        annotations: {
            "pulumi.com/patchFieldManager": "kubernetes-ts-ssa-deploy"
        },
    },
    spec: {
        selector: { matchLabels: appLabels },
        replicas: 1,
        template: {
            metadata: { labels: appLabels },
            spec: { containers: [{ name: "nginx", image: "nginx" }] }
        }
    }
}, {
    // this program sets the initial scale and then hands off to other managers.
    ignoreChanges: ["spec.replicas"]
});

export const name = deployment.metadata.name;
