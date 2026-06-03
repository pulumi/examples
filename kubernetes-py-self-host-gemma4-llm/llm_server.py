import pulumi
import pulumi_kubernetes as k8s

GPU_RESOURCE_KEYS = {
    "nvidia": "nvidia.com/gpu",
    "amd": "amd.com/gpu",
}

LLAMA_SERVER_IMAGES = {
    "nvidia": "ghcr.io/ggml-org/llama.cpp:server-cuda",
    "amd": "ghcr.io/ggml-org/llama.cpp:server-rocm",
}

_INTERNAL_PORT = 8080


class LlmServer(pulumi.ComponentResource):
    url: pulumi.Output[str]
    service: k8s.core.v1.Service

    def __init__(
        self,
        name,
        model,
        model_file,
        port,
        gpu_vendor="nvidia",
        gpu_count=1,
        node_port=None,
        namespace="default",
        context_size=8192,
        fit_target=2048,
        parallel=1,
        mmproj=None,
        threads=5,
        jinja=True,
        server_args=None,
        opts=None,
    ):
        super().__init__("selfhost:llm:LlmServer", name, None, opts)

        if gpu_vendor not in GPU_RESOURCE_KEYS:
            raise ValueError(
                f"Unsupported gpu_vendor '{gpu_vendor}', must be one of: {', '.join(GPU_RESOURCE_KEYS)}"
            )

        labels = {"app": name}
        model_dir = "/models"
        model_path = f"{model_dir}/{model_file}"
        gpu_resource = GPU_RESOURCE_KEYS[gpu_vendor]
        image = LLAMA_SERVER_IMAGES[gpu_vendor]

        args = [
            "-m",
            model_path,
            "-c",
            str(context_size),
            "--fit-target",
            str(fit_target),
            "-fa",
            "on",
            "--no-mmap",
            *(["--jinja"] if jinja else []),
            "-ctk",
            "q8_0",
            "-ctv",
            "q8_0",
            "-t",
            str(threads),
            "--temp",
            "1.0",
            "--top-p",
            "0.95",
            "--top-k",
            "20",
            "--min-p",
            "0.00",
            "--presence-penalty",
            "1.5",
            "--repeat-penalty",
            "1.0",
            "--port",
            str(_INTERNAL_PORT),
            "--host",
            "0.0.0.0",
            "--parallel",
            str(parallel),
        ]
        if mmproj:
            args += ["--mmproj", f"{model_dir}/{mmproj}"]
        # Escape hatch: pass arbitrary llama.cpp flags without adding constructor params
        for k, v in (server_args or {}).items():
            args += [f"--{k}", str(v)]

        download_files = f"{model_file} {mmproj}" if mmproj else model_file
        models_mount = [k8s.core.v1.VolumeMountArgs(name="models", mount_path=model_dir)]

        init_containers = [
            k8s.core.v1.ContainerArgs(
                name="download-model",
                # Uses uvx to run hf download without baking huggingface-cli into a custom image.
                # hf download is idempotent — skips files already on the PVC.
                image="ghcr.io/astral-sh/uv:python3.12-bookworm-slim",
                command=[
                    "sh",
                    "-c",
                    f"uvx --from huggingface_hub hf download {model} {download_files} "
                    + f"--local-dir {model_dir}",
                ],
                volume_mounts=models_mount,
            ),
        ]

        self.models_pvc = k8s.core.v1.PersistentVolumeClaim(
            f"{name}-models",
            metadata=k8s.meta.v1.ObjectMetaArgs(
                name=f"{name}-models",
                namespace=namespace,
            ),
            spec=k8s.core.v1.PersistentVolumeClaimSpecArgs(
                access_modes=["ReadWriteOnce"],
                resources=k8s.core.v1.VolumeResourceRequirementsArgs(
                    requests={"storage": "50Gi"},
                ),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.deployment = k8s.apps.v1.Deployment(
            name,
            metadata=k8s.meta.v1.ObjectMetaArgs(
                name=name,
                namespace=namespace,
                labels=labels,
            ),
            spec=k8s.apps.v1.DeploymentSpecArgs(
                replicas=1,
                progress_deadline_seconds=1800,
                selector=k8s.meta.v1.LabelSelectorArgs(match_labels=labels),
                strategy=k8s.apps.v1.DeploymentStrategyArgs(type="Recreate"),
                template=k8s.core.v1.PodTemplateSpecArgs(
                    metadata=k8s.meta.v1.ObjectMetaArgs(labels=labels),
                    spec=k8s.core.v1.PodSpecArgs(
                        init_containers=init_containers,
                        containers=[
                            k8s.core.v1.ContainerArgs(
                                name=name,
                                image=image,
                                args=args,
                                ports=[
                                    k8s.core.v1.ContainerPortArgs(container_port=_INTERNAL_PORT)
                                ],
                                resources=k8s.core.v1.ResourceRequirementsArgs(
                                    limits={gpu_resource: str(gpu_count)},
                                ),
                                volume_mounts=models_mount,
                            ),
                        ],
                        volumes=[
                            k8s.core.v1.VolumeArgs(
                                name="models",
                                persistent_volume_claim=k8s.core.v1.PersistentVolumeClaimVolumeSourceArgs(
                                    claim_name=self.models_pvc.metadata.name,
                                ),
                            ),
                        ],
                    ),
                ),
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
                depends_on=[self.models_pvc],
            ),
        )

        if node_port:
            service_port = k8s.core.v1.ServicePortArgs(
                port=port,
                target_port=_INTERNAL_PORT,
                node_port=node_port,
            )
            service_spec = k8s.core.v1.ServiceSpecArgs(
                selector=labels,
                type="NodePort",
                ports=[service_port],
            )
        else:
            service_port = k8s.core.v1.ServicePortArgs(
                port=port,
                target_port=_INTERNAL_PORT,
            )
            service_spec = k8s.core.v1.ServiceSpecArgs(
                selector=labels,
                ports=[service_port],
            )

        self.service = k8s.core.v1.Service(
            name,
            metadata=k8s.meta.v1.ObjectMetaArgs(
                name=name,
                namespace=namespace,
            ),
            spec=service_spec,
            opts=pulumi.ResourceOptions(parent=self),
        )

        self.url = pulumi.Output.concat("http://", name, ":", str(port), "/v1")
        self.register_outputs({"url": self.url})
