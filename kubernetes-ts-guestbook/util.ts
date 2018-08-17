import * as k8s from "@pulumi/kubernetes";

export function deployContainer(name: string, replicas: number, container: any) {
    const labels = { app: name };
    return new k8s.apps.v1beta1.Deployment(name, {
        spec: {
            selector: { matchLabels: labels },
            replicas: replicas,
            template: {
                metadata: { labels: labels },
                spec: { containers: [container] }
            }
        }
    });
}
