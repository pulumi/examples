import json
import pulumi

def generate_kube_config(eks_cluster):

    kubeconfig = pulumi.Output.all(eks_cluster.endpoint, eks_cluster.certificate_authority.apply(lambda v: v.data), eks_cluster.name).apply(lambda args: json.dumps({
        "apiVersion": "v1",
        "clusters": [{
            "cluster": {
                "server": args[0],
                "certificate-authority-data": args[1]
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
                    "apiVersion": "client.authentication.k8s.io/v1alpha1",
                    "command": "aws-iam-authenticator",
                    "args": [
                        "token",
                        "-i",
                        args[2],
                    ],
                },
            },
        }],
    }))
    return kubeconfig
