"""The chat application: image build, Deployment, and the public load balancer.

Exposure is a Pulumi-owned Service of type LoadBalancer (an AWS classic ELB
provisioned by the cloud controller manager EKS runs in the control plane).
Owning it, rather than routing through the recipe's inference gateway, is what
lets us tag the ELB (the sandbox reaper deletes untagged ELBs hourly), set
cross-zone balancing and idle timeout, and have Pulumi await the hostname so
`chat_url` is right on the first `pulumi up`.
"""

import os
from dataclasses import dataclass

import pulumi
import pulumi_aws as aws
import pulumi_docker_build as docker_build
import pulumi_kubernetes as k8s

APP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app")
APP_PORT = 8080
APP_UID = 10001
NAMESPACE = "chatbot"


@dataclass
class ChatbotSpec:
    name: str
    llm_base_url: str  # in-cluster URL of the OpenAI-compatible endpoint
    model: str  # served model id, shown in the page header
    owner: str  # Owner tag value for the ELB and ECR repo
    replicas: int = 2
    served_by: str = "NVIDIA Dynamo on AWS EKS (Pulumi NVIDIA AICR provider)"


def service_annotations(owner: str) -> dict:
    """Annotations the AWS cloud controller manager honours for classic ELBs."""
    return {
        # The account reaper deletes classic ELBs without an Owner tag after an hour.
        "service.beta.kubernetes.io/aws-load-balancer-additional-resource-tags": f"Owner={owner}",
        # The ASG spans five AZs, nodes occupy two.
        "service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled": "true",
        # Headroom for a slow first token on a streamed reply.
        "service.beta.kubernetes.io/aws-load-balancer-connection-idle-timeout": "120",
    }


def build_image(name: str, owner: str) -> docker_build.Image:
    """Build app/ for linux/amd64 and push it to an ECR repo created here."""
    repo = aws.ecr.Repository(
        name,
        force_delete=True,  # images inside must not block `pulumi destroy`
        image_tag_mutability="MUTABLE",
        tags={"Owner": owner},  # the reaper sweeps untagged ECR repos too
    )
    auth = aws.ecr.get_authorization_token_output(registry_id=repo.registry_id)
    return docker_build.Image(
        name,
        tags=[repo.repository_url.apply(lambda url: f"{url}:latest")],
        context=docker_build.BuildContextArgs(location=APP_DIR),
        platforms=[docker_build.Platform.LINUX_AMD64],
        push=True,
        registries=[
            docker_build.RegistryArgs(
                address=auth.proxy_endpoint,
                username=auth.user_name,
                password=auth.password,
            )
        ],
    )


def deploy_chatbot(
    spec: ChatbotSpec, image_ref: pulumi.Input[str], *, provider: k8s.Provider, depends_on: list
) -> k8s.core.v1.Service:
    opts = pulumi.ResourceOptions(provider=provider, depends_on=list(depends_on))
    labels = {"app": spec.name}

    ns = k8s.core.v1.Namespace(NAMESPACE, metadata={"name": NAMESPACE}, opts=opts)
    child = pulumi.ResourceOptions.merge(opts, pulumi.ResourceOptions(depends_on=[ns]))

    k8s.apps.v1.Deployment(
        spec.name,
        metadata={"name": spec.name, "namespace": NAMESPACE, "labels": labels},
        spec={
            "replicas": spec.replicas,
            "selector": {"matchLabels": labels},
            "template": {
                "metadata": {"labels": labels},
                "spec": {
                    "containers": [
                        {
                            "name": "chatbot",
                            "image": image_ref,
                            "ports": [{"containerPort": APP_PORT, "name": "http"}],
                            "env": [
                                {"name": "LLM_BASE_URL", "value": spec.llm_base_url},
                                {"name": "MODEL_NAME", "value": spec.model},
                                {"name": "SERVED_BY", "value": spec.served_by},
                            ],
                            "resources": {
                                "requests": {"cpu": "100m", "memory": "128Mi"},
                                "limits": {"memory": "512Mi"},
                            },
                            "readinessProbe": {
                                "httpGet": {"path": "/healthz", "port": "http"},
                                "periodSeconds": 5,
                            },
                            "livenessProbe": {
                                "httpGet": {"path": "/healthz", "port": "http"},
                                "periodSeconds": 20,
                            },
                            # Matches the numeric USER in app/Dockerfile.
                            "securityContext": {
                                "runAsNonRoot": True,
                                "runAsUser": APP_UID,
                                "allowPrivilegeEscalation": False,
                            },
                        }
                    ]
                },
            },
        },
        opts=child,
    )

    return k8s.core.v1.Service(
        spec.name,
        metadata={
            "name": spec.name,
            "namespace": NAMESPACE,
            "labels": labels,
            "annotations": service_annotations(spec.owner),
        },
        spec={
            "type": "LoadBalancer",
            "selector": labels,
            "ports": [{"name": "http", "port": 80, "targetPort": "http"}],
        },
        opts=child,
    )


def public_url(service: k8s.core.v1.Service) -> pulumi.Output[str]:
    """http:// URL of the load balancer; pulumi-kubernetes awaits the ingress hostname."""
    hostname = service.status.apply(lambda s: s.load_balancer.ingress[0].hostname)
    return pulumi.Output.concat("http://", hostname, "/")
