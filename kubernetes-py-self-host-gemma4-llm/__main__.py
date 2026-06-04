import pulumi
import pulumi_kubernetes as k8s
import pulumi_tailscale as tailscale

from llm_server import LlmServer

config = pulumi.Config()
runtime_mode = config.get("runtimeMode") or "host"
gpu_vendor = config.get("gpuVendor") or "nvidia"
webui_port = config.get_int("webuiPort") or 30000
llm_port = config.get_int("llmPort") or 8080
llm_node_port = config.get_int("llmNodePort") or 30080
hostname = config.get("hostname") or "llm-server"
enable_tailscale = config.get_bool("enableTailscale")
if enable_tailscale is None:
    enable_tailscale = False
model = config.get("model") or "unsloth/gemma-4-12b-it-GGUF"
model_file = config.get("modelFile") or "gemma-4-12b-it-Q8_0.gguf"
context_size = config.get_int("contextSize") or 131072
fit_target = config.get_int("fitTarget") or 2048
parallel = config.get_int("parallel") or 1
threads = config.get_int("threads") or 5
host_llm_hostname = config.get("hostLlmHostname") or "host.k3d.internal"
host_llm_port = config.get_int("hostLlmPort") or 18080
default_llm_base_url = (
    "http://llm-server:18080/v1" if runtime_mode == "host" else "http://llm-server:8080/v1"
)
llm_base_url = config.get("llmBaseUrl") or default_llm_base_url
reasoning = config.get("reasoning") or "off"
jinja = config.get_bool("jinja")
if jinja is None:
    jinja = True

if runtime_mode not in ["host", "cluster"]:
    raise ValueError("runtimeMode must be 'host' or 'cluster'")

NAMESPACE = "llm"

ns = k8s.core.v1.Namespace(
    NAMESPACE,
    metadata=k8s.meta.v1.ObjectMetaArgs(name=NAMESPACE),
)
ns_opts = pulumi.ResourceOptions(depends_on=[ns])

if runtime_mode == "host":
    llm_service = k8s.core.v1.Service(
        "llm-server",
        metadata=k8s.meta.v1.ObjectMetaArgs(name="llm-server", namespace=NAMESPACE),
        spec=k8s.core.v1.ServiceSpecArgs(
            type="ExternalName",
            external_name=host_llm_hostname,
            ports=[
                k8s.core.v1.ServicePortArgs(
                    port=host_llm_port,
                    target_port=host_llm_port,
                ),
            ],
        ),
        opts=ns_opts,
    )
else:
    llm_service = LlmServer(
        "llm-server",
        model=model,
        model_file=model_file,
        port=llm_port,
        gpu_vendor=gpu_vendor,
        gpu_count=config.get_int("gpuCount") or 1,
        node_port=llm_node_port,
        namespace=NAMESPACE,
        context_size=context_size,
        fit_target=fit_target,
        parallel=parallel,
        threads=threads,
        jinja=jinja,
        server_args={"reasoning": reasoning},
        mmproj=config.get("mmproj"),
        opts=ns_opts,
    )

# --- Open WebUI ---

webui_labels = {"app": "open-webui"}

webui_pvc = k8s.core.v1.PersistentVolumeClaim(
    "open-webui-data",
    metadata=k8s.meta.v1.ObjectMetaArgs(name="open-webui-data", namespace=NAMESPACE),
    spec=k8s.core.v1.PersistentVolumeClaimSpecArgs(
        access_modes=["ReadWriteOnce"],
        resources=k8s.core.v1.VolumeResourceRequirementsArgs(
            requests={"storage": "5Gi"},
        ),
    ),
    opts=ns_opts,
)

webui_deployment = k8s.apps.v1.Deployment(
    "open-webui",
    metadata=k8s.meta.v1.ObjectMetaArgs(
        name="open-webui", namespace=NAMESPACE, labels=webui_labels
    ),
    spec=k8s.apps.v1.DeploymentSpecArgs(
        replicas=1,
        selector=k8s.meta.v1.LabelSelectorArgs(match_labels=webui_labels),
        template=k8s.core.v1.PodTemplateSpecArgs(
            metadata=k8s.meta.v1.ObjectMetaArgs(labels=webui_labels),
            spec=k8s.core.v1.PodSpecArgs(
                containers=[
                    k8s.core.v1.ContainerArgs(
                        name="open-webui",
                        image="ghcr.io/open-webui/open-webui:main",
                        ports=[k8s.core.v1.ContainerPortArgs(container_port=8080)],
                        env=[
                            k8s.core.v1.EnvVarArgs(
                                name="OPENAI_API_BASE_URLS",
                                value=llm_base_url,
                            ),
                            k8s.core.v1.EnvVarArgs(name="OPENAI_API_KEYS", value="not-needed"),
                            k8s.core.v1.EnvVarArgs(name="WEBUI_AUTH", value="false"),
                        ],
                        volume_mounts=[
                            k8s.core.v1.VolumeMountArgs(
                                name="data",
                                mount_path="/app/backend/data",
                            ),
                        ],
                    ),
                ],
                volumes=[
                    k8s.core.v1.VolumeArgs(
                        name="data",
                        persistent_volume_claim=k8s.core.v1.PersistentVolumeClaimVolumeSourceArgs(
                            claim_name=webui_pvc.metadata.name,
                        ),
                    ),
                ],
            ),
        ),
    ),
    opts=pulumi.ResourceOptions(depends_on=[ns, webui_pvc]),
)

webui_service = k8s.core.v1.Service(
    "open-webui",
    metadata=k8s.meta.v1.ObjectMetaArgs(name="open-webui", namespace=NAMESPACE),
    spec=k8s.core.v1.ServiceSpecArgs(
        selector=webui_labels,
        type="NodePort",
        ports=[
            k8s.core.v1.ServicePortArgs(
                port=webui_port,
                target_port=8080,
                node_port=webui_port,
            ),
        ],
    ),
    opts=ns_opts,
)

if enable_tailscale:
    # --- Tailscale RBAC (must be created before the Tailscale deployment that
    #     references service_account_name="tailscale") ---

    ts_sa = k8s.core.v1.ServiceAccount(
        "tailscale",
        metadata=k8s.meta.v1.ObjectMetaArgs(name="tailscale", namespace=NAMESPACE),
        opts=ns_opts,
    )

    ts_role = k8s.rbac.v1.Role(
        "tailscale",
        metadata=k8s.meta.v1.ObjectMetaArgs(name="tailscale", namespace=NAMESPACE),
        rules=[
            k8s.rbac.v1.PolicyRuleArgs(
                api_groups=[""],
                resources=["secrets"],
                verbs=["create", "get", "update", "patch"],
            ),
        ],
        opts=ns_opts,
    )

    ts_role_binding = k8s.rbac.v1.RoleBinding(
        "tailscale",
        metadata=k8s.meta.v1.ObjectMetaArgs(name="tailscale", namespace=NAMESPACE),
        subjects=[
            k8s.rbac.v1.SubjectArgs(
                kind="ServiceAccount",
                name="tailscale",
                namespace=NAMESPACE,
            ),
        ],
        role_ref=k8s.rbac.v1.RoleRefArgs(
            api_group="rbac.authorization.k8s.io",
            kind="Role",
            name="tailscale",
        ),
        opts=ns_opts,
    )

    # --- Tailscale ---

    ts_acl = tailscale.Acl(
        "tailnet-acl",
        acl=pulumi.Output.json_dumps(
            {
                "tagOwners": {
                    "tag:llm-server": ["autogroup:admin"],
                },
                "acls": [
                    {
                        "action": "accept",
                        "src": ["autogroup:member"],
                        "dst": ["*:*"],
                    },
                ],
            }
        ),
        # The Tailscale ACL is a global singleton per tailnet — it can't be truly
        # created or deleted, only updated. import_ adopts the existing ACL into
        # state on first `pulumi up`, and retain_on_delete prevents `pulumi destroy`
        # from trying to delete it (which would fail or leave the tailnet broken).
        # Without these, destroy+up cycles fail with a "precondition failed" 412 error.
        opts=pulumi.ResourceOptions(
            import_="acl",
            retain_on_delete=True,
        ),
    )

    ts_key = tailscale.TailnetKey(
        "llm-server-key",
        reusable=True,
        ephemeral=True,
        preauthorized=True,
        tags=["tag:llm-server"],
        description="Pulumi-managed key for LLM server",
        opts=pulumi.ResourceOptions(depends_on=[ts_acl]),
    )

    ts_secret = k8s.core.v1.Secret(
        "tailscale-auth",
        metadata=k8s.meta.v1.ObjectMetaArgs(name="tailscale-auth", namespace=NAMESPACE),
        string_data={
            "TS_AUTHKEY": ts_key.key,
        },
        opts=ns_opts,
    )

    ts_labels = {"app": "tailscale"}

    ts_deployment = k8s.apps.v1.Deployment(
        "tailscale",
        metadata=k8s.meta.v1.ObjectMetaArgs(
            name="tailscale", namespace=NAMESPACE, labels=ts_labels
        ),
        spec=k8s.apps.v1.DeploymentSpecArgs(
            replicas=1,
            selector=k8s.meta.v1.LabelSelectorArgs(match_labels=ts_labels),
            template=k8s.core.v1.PodTemplateSpecArgs(
                metadata=k8s.meta.v1.ObjectMetaArgs(labels=ts_labels),
                spec=k8s.core.v1.PodSpecArgs(
                    service_account_name="tailscale",
                    init_containers=[
                        k8s.core.v1.ContainerArgs(
                            name="sysctler",
                            image="busybox",
                            command=["/bin/sh", "-c"],
                            args=["sysctl -w net.ipv4.ip_forward=1 net.ipv6.conf.all.forwarding=1"],
                            security_context=k8s.core.v1.SecurityContextArgs(
                                privileged=True,
                            ),
                        ),
                    ],
                    containers=[
                        k8s.core.v1.ContainerArgs(
                            name="tailscale",
                            image="ghcr.io/tailscale/tailscale:latest",
                            env=[
                                k8s.core.v1.EnvVarArgs(
                                    name="TS_AUTHKEY",
                                    value_from=k8s.core.v1.EnvVarSourceArgs(
                                        secret_key_ref=k8s.core.v1.SecretKeySelectorArgs(
                                            name="tailscale-auth",
                                            key="TS_AUTHKEY",
                                        ),
                                    ),
                                ),
                                k8s.core.v1.EnvVarArgs(name="TS_HOSTNAME", value=hostname),
                                k8s.core.v1.EnvVarArgs(
                                    name="TS_STATE_DIR", value="/var/lib/tailscale"
                                ),
                                k8s.core.v1.EnvVarArgs(name="TS_USERSPACE", value="false"),
                                k8s.core.v1.EnvVarArgs(
                                    name="TS_DEST_IP",
                                    value=webui_service.spec.cluster_ip,
                                ),
                                k8s.core.v1.EnvVarArgs(
                                    name="TS_KUBE_SECRET", value="tailscale-state"
                                ),
                            ],
                            volume_mounts=[
                                k8s.core.v1.VolumeMountArgs(
                                    name="tailscale-state",
                                    mount_path="/var/lib/tailscale",
                                ),
                                k8s.core.v1.VolumeMountArgs(
                                    name="dev-tun",
                                    mount_path="/dev/net/tun",
                                ),
                            ],
                            security_context=k8s.core.v1.SecurityContextArgs(
                                privileged=True,
                            ),
                        ),
                    ],
                    volumes=[
                        k8s.core.v1.VolumeArgs(
                            name="tailscale-state",
                            empty_dir=k8s.core.v1.EmptyDirVolumeSourceArgs(),
                        ),
                        k8s.core.v1.VolumeArgs(
                            name="dev-tun",
                            host_path=k8s.core.v1.HostPathVolumeSourceArgs(
                                path="/dev/net/tun",
                                type="CharDevice",
                            ),
                        ),
                    ],
                ),
            ),
        ),
        # Needs the secret (for TS_AUTHKEY), SA and RBAC (for kube secret access)
        opts=pulumi.ResourceOptions(depends_on=[ns, ts_secret, ts_sa, ts_role_binding]),
    )

# --- Outputs ---

pulumi.export("local_webui_url", f"http://localhost:{webui_port}")
pulumi.export("tailscale_enabled", enable_tailscale)
if enable_tailscale:
    pulumi.export("tailscale_webui_url", f"http://{hostname}:{webui_port}")
pulumi.export("runtime_mode", runtime_mode)
pulumi.export("llm_base_url", llm_base_url)
pulumi.export("model", model)
if runtime_mode == "host":
    pulumi.export("host_llm_url", f"http://{host_llm_hostname}:{host_llm_port}/v1")
else:
    pulumi.export("cluster_api_url", f"http://localhost:{llm_node_port}/v1")
