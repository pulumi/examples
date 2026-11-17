"""The LLM: a DynamoGraphDeployment served by NVIDIA Dynamo's vLLM backend.

Shape follows AICR's own smoke test (tests/manifests/dynamo-vllm-smoke-test.yaml
in the AICR SDK): one Frontend (router, no GPU) and N decode workers with one
GPU each. Every node has exactly one GPU, so N workers land on N nodes.
"""

from dataclasses import dataclass
from typing import Optional

import pulumi
import pulumi_kubernetes as k8s

# Pinned together with the recipe's dynamo-platform chart (1.4.2): runtime image
# vs operator version skew is a documented hazard in the AICR component catalog.
DYNAMO_RUNTIME_IMAGE = "nvcr.io/nvidia/ai-dynamo/vllm-runtime:1.4.2"
DYNAMO_NAMESPACE = "dynamo-system"
FRONTEND_PORT = 8000

# Node-local Hugging Face cache so a worker restart is warm instead of a fresh
# download. Each node caches once. kubelet creates the hostPath root-owned, and
# the runtime image runs as uid 1000 (user "dynamo", gid 0), so an init
# container hands the directory over first.
HF_CACHE_HOST_PATH = "/var/lib/hf-cache"
HF_CACHE_MOUNT = "/hf-cache"
RUNTIME_UID = 1000
RUNTIME_GID = 0


@dataclass
class ModelSpec:
    name: str  # DynamoGraphDeployment name
    model: str  # Hugging Face model id
    replicas: int  # decode workers (== GPUs used)
    max_model_len: int = 8192
    hf_token_secret: Optional[str] = None  # name of a Secret with key "token"
    namespace: str = DYNAMO_NAMESPACE

    @property
    def frontend_service(self) -> str:
        """Service the operator creates for the Frontend component."""
        return f"{self.name}-frontend"

    @property
    def frontend_url(self) -> str:
        return f"http://{self.frontend_service}.{self.namespace}.svc.cluster.local:{FRONTEND_PORT}"


def graph_deployment_spec(spec: ModelSpec) -> dict:
    """The DynamoGraphDeployment .spec, as plain data so it can be unit-tested."""
    plane_env = [
        {"name": "DYN_REQUEST_PLANE", "value": "tcp"},
        {"name": "DYN_EVENT_PLANE", "value": "zmq"},
    ]
    worker_env = plane_env + [{"name": "HF_HOME", "value": HF_CACHE_MOUNT}]
    if spec.hf_token_secret:
        worker_env.append(
            {
                "name": "HF_TOKEN",
                "valueFrom": {"secretKeyRef": {"name": spec.hf_token_secret, "key": "token"}},
            }
        )

    return {
        "backendFramework": "vllm",
        "components": [
            {
                "name": "Frontend",
                "type": "frontend",
                "replicas": 1,
                "podTemplate": {
                    "spec": {
                        "containers": [
                            {
                                "name": "main",
                                "image": DYNAMO_RUNTIME_IMAGE,
                                "env": [
                                    {"name": "SERVED_MODEL_NAME", "value": spec.model},
                                    {"name": "DYN_ROUTER_MODE", "value": "kv"},
                                ]
                                + plane_env,
                                "resources": {"requests": {"cpu": "500m", "memory": "1Gi"}},
                            }
                        ]
                    }
                },
            },
            {
                "name": "VllmDecodeWorker",
                "type": "worker",
                "replicas": spec.replicas,
                "sharedMemorySize": "2Gi",
                "podTemplate": {
                    "spec": {
                        "tolerations": [
                            {"key": "nvidia.com/gpu", "operator": "Exists", "effect": "NoSchedule"}
                        ],
                        "volumes": [
                            {
                                "name": "hf-cache",
                                "hostPath": {
                                    "path": HF_CACHE_HOST_PATH,
                                    "type": "DirectoryOrCreate",
                                },
                            }
                        ],
                        # Same image as the worker, so it costs no extra pull.
                        "initContainers": [
                            {
                                "name": "chown-hf-cache",
                                "image": DYNAMO_RUNTIME_IMAGE,
                                "command": [
                                    "sh",
                                    "-c",
                                    f"chown {RUNTIME_UID}:{RUNTIME_GID} {HF_CACHE_MOUNT} && chmod 0775 {HF_CACHE_MOUNT}",
                                ],
                                "securityContext": {"runAsUser": 0},
                                "volumeMounts": [{"name": "hf-cache", "mountPath": HF_CACHE_MOUNT}],
                            }
                        ],
                        "containers": [
                            {
                                "name": "main",
                                "image": DYNAMO_RUNTIME_IMAGE,
                                "workingDir": "/workspace/examples/backends/vllm",
                                "command": ["python3", "-m", "dynamo.vllm"],
                                "args": [
                                    "--model",
                                    spec.model,
                                    "--max-model-len",
                                    str(spec.max_model_len),
                                    "--kv-events-config",
                                    '{"enable_kv_cache_events":true,"publisher":"zmq","endpoint":"tcp://*:5557"}',
                                ],
                                "env": worker_env,
                                "volumeMounts": [{"name": "hf-cache", "mountPath": HF_CACHE_MOUNT}],
                                "resources": {
                                    "requests": {"cpu": "2", "memory": "8Gi"},
                                    "limits": {
                                        "nvidia.com/gpu": "1",
                                        "memory": "16Gi",
                                    },  # quantities are strings server-side
                                },
                            }
                        ],
                    }
                },
            },
        ],
    }


def deploy_model(
    spec: ModelSpec,
    *,
    provider: k8s.Provider,
    depends_on: list,
    hf_token: Optional[pulumi.Output[str]] = None,
) -> k8s.apiextensions.CustomResource:
    opts = pulumi.ResourceOptions(provider=provider, depends_on=list(depends_on))

    if hf_token is not None:
        assert spec.hf_token_secret, "hf_token given but spec.hf_token_secret is unset"
        secret = k8s.core.v1.Secret(
            spec.hf_token_secret,
            metadata={"name": spec.hf_token_secret, "namespace": spec.namespace},
            string_data={"token": hf_token},
            opts=opts,
        )
        opts = pulumi.ResourceOptions.merge(opts, pulumi.ResourceOptions(depends_on=[secret]))

    return k8s.apiextensions.CustomResource(
        spec.name,
        api_version="nvidia.com/v1beta1",
        kind="DynamoGraphDeployment",
        metadata={"name": spec.name, "namespace": spec.namespace},
        spec=graph_deployment_spec(spec),
        opts=opts,
    )
