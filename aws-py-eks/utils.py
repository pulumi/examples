import json

import pulumi


def generate_kube_config(eks_cluster):

    kubeconfig = pulumi.Output.json_dumps({
        "apiVersion": "v1",
        "clusters": [{
            "cluster": {
                "server": eks_cluster.endpoint,
                "certificate-authority-data": eks_cluster.certificate_authority.apply(lambda v: v.data)
            },
            "name": "kubernetes",
        }],
        "contexts": [{
            "context": {
                "cluster": "kubernetes",
                "user": "aws",
            },
            "name": "aws",
        }],
        "current-context": "aws",
        "kind": "Config",
        "users": [{
            "name": "aws",
            "user": {
                "exec": {
                    "apiVersion": "client.authentication.k8s.io/v1beta1",
                    "command": "aws-iam-authenticator",
                    "args": [
                        "token",
                        "-i",
                        eks_cluster.endpoint,
                    ],
                },
            },
        }],
    })
    return kubeconfig
