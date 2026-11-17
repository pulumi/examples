"""Unit tests for the pure pieces (no Pulumi runtime needed)."""

import chatbot
import cluster
import model
import pulumi
import pytest
from conftest import FAKE_ELB_HOSTNAME, RecordingMocks


def test_ubuntu_ami_pattern_follows_canonical_naming():
    assert cluster.ubuntu_eks_ami_name_pattern("1.35") == \
        "ubuntu-eks/k8s_1.35/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"


def test_cluster_spec_tags_merge_owner_with_extras():
    spec = cluster.ClusterSpec(name="x", instance_type="g6.2xlarge", node_count=2, k8s_version="1.35",
                               owner="o@example.com", extra_tags={"nvidia.com/aicr": "demo"})
    assert spec.tags == {"Owner": "o@example.com", "nvidia.com/aicr": "demo"}


def test_model_spec_frontend_url_matches_operator_service_naming():
    spec = model.ModelSpec(name="chat-llm", model="m", replicas=2)
    assert spec.frontend_service == "chat-llm-frontend"
    assert spec.frontend_url == "http://chat-llm-frontend.dynamo-system.svc.cluster.local:8000"


def test_graph_deployment_spec_shape():
    spec = model.graph_deployment_spec(model.ModelSpec(name="chat-llm", model="org/m", replicas=3, max_model_len=4096))
    frontend, worker = spec["components"]
    assert (frontend["type"], worker["type"]) == ("frontend", "worker")
    assert worker["replicas"] == 3
    assert worker["sharedMemorySize"] == "2Gi"
    fe_env = {e["name"]: e["value"] for e in frontend["podTemplate"]["spec"]["containers"][0]["env"]}
    assert fe_env["SERVED_MODEL_NAME"] == "org/m"
    assert fe_env["DYN_ROUTER_MODE"] == "kv"
    assert fe_env["DYN_REQUEST_PLANE"] == "tcp" and fe_env["DYN_EVENT_PLANE"] == "zmq"
    c = worker["podTemplate"]["spec"]["containers"][0]
    assert c["command"] == ["python3", "-m", "dynamo.vllm"]
    assert c["args"][c["args"].index("--max-model-len") + 1] == "4096"
    assert worker["podTemplate"]["spec"]["tolerations"] == [
        {"key": "nvidia.com/gpu", "operator": "Exists", "effect": "NoSchedule"}]
    assert "affinity" not in worker["podTemplate"]["spec"], "one GPU per node already spreads the workers"


def test_worker_caches_models_on_the_node():
    spec = model.graph_deployment_spec(model.ModelSpec(name="n", model="m", replicas=1))
    worker = spec["components"][1]["podTemplate"]["spec"]
    assert worker["volumes"] == [{"name": "hf-cache", "hostPath": {"path": model.HF_CACHE_HOST_PATH,
                                                                  "type": "DirectoryOrCreate"}}]
    c = worker["containers"][0]
    assert c["volumeMounts"] == [{"name": "hf-cache", "mountPath": model.HF_CACHE_MOUNT}]
    assert {"name": "HF_HOME", "value": model.HF_CACHE_MOUNT} in c["env"]


def test_cache_directory_is_handed_to_the_runtime_user_before_the_worker_starts():
    """kubelet creates the hostPath root-owned; the runtime runs as uid 1000."""
    spec = model.graph_deployment_spec(model.ModelSpec(name="n", model="m", replicas=1))
    worker = spec["components"][1]["podTemplate"]["spec"]
    (init,) = worker["initContainers"]
    assert init["image"] == model.DYNAMO_RUNTIME_IMAGE, "same image as the worker: no extra pull"
    assert init["securityContext"] == {"runAsUser": 0}
    assert init["volumeMounts"] == [{"name": "hf-cache", "mountPath": model.HF_CACHE_MOUNT}]
    assert f"chown {model.RUNTIME_UID}:{model.RUNTIME_GID} {model.HF_CACHE_MOUNT}" in init["command"][-1]


def test_worker_env_carries_hf_token_only_when_secret_named():
    without = model.graph_deployment_spec(model.ModelSpec(name="n", model="m", replicas=1))
    names = [e["name"] for e in without["components"][1]["podTemplate"]["spec"]["containers"][0]["env"]]
    assert "HF_TOKEN" not in names
    with_token = model.graph_deployment_spec(model.ModelSpec(name="n", model="m", replicas=1, hf_token_secret="s"))
    env = {e["name"]: e for e in with_token["components"][1]["podTemplate"]["spec"]["containers"][0]["env"]}
    assert env["HF_TOKEN"]["valueFrom"]["secretKeyRef"] == {"name": "s", "key": "token"}


def test_worker_resources_fit_the_node_budget():
    spec = model.graph_deployment_spec(model.ModelSpec(name="n", model="m", replicas=1))
    res = spec["components"][1]["podTemplate"]["spec"]["containers"][0]["resources"]
    assert res["requests"] == {"cpu": "2", "memory": "8Gi"}
    assert res["limits"]["nvidia.com/gpu"] == "1"


def test_service_annotations_tag_the_elb_for_the_reaper():
    ann = chatbot.service_annotations("me@example.com")
    assert ann["service.beta.kubernetes.io/aws-load-balancer-additional-resource-tags"] == "Owner=me@example.com"


def test_deploy_model_refuses_token_without_secret_name():
    with pytest.raises(AssertionError):
        model.deploy_model(model.ModelSpec(name="n", model="m", replicas=1), provider=None,
                           depends_on=[], hf_token=pulumi.Output.from_input("x"))


def test_public_url_reads_the_load_balancer_hostname():
    import pulumi_kubernetes as k8s
    pulumi.runtime.set_mocks(RecordingMocks(), project="aicr-chatbot-demo", stack="unit", preview=False)

    @pulumi.runtime.test
    def check():
        svc = k8s.core.v1.Service("lb", spec={"type": "LoadBalancer"})
        return chatbot.public_url(svc).apply(lambda url: _assert_eq(url, f"http://{FAKE_ELB_HOSTNAME}/"))

    check()


def _assert_eq(actual, expected):
    assert actual == expected
