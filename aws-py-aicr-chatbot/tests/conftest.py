"""Test harness: run the Pulumi program under the SDK's mock runtime and record
every resource it registers, with fully resolved inputs, for assertions."""

import json
import runpy
import sys
from pathlib import Path

import pulumi
from pulumi.runtime.mocks import MockMonitor
import pytest

INFRA = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(INFRA))

PROJECT = "aicr-chatbot-demo"
FAKE_KUBECONFIG = json.dumps({"apiVersion": "v1", "kind": "Config", "clusters": [{"name": "fake"}]})
FAKE_IMAGE_REF = "123456789012.dkr.ecr.us-east-1.amazonaws.com/aicr-chatbot-chatbot@sha256:deadbeef"
FAKE_ELB_HOSTNAME = "a1b2c3-1234.us-east-1.elb.amazonaws.com"
FAKE_COMPONENTS = ["cert-manager", "gpu-operator", "grove", "dynamo-platform"]
FAKE_EKS_CLUSTER_NAME = "aicr-chatbot-eksCluster-abc123"

# Pulumi's wire-format markers: a map with the special key is a reference to
# another resource, or a secret-wrapped value.
_SIG_KEY = "4dabf18193072939515e22adb298388d"
_RESOURCE_REF_SIG = {_SIG_KEY: "5cf8f73096256a8f31e491e813e4eb8e"}
_SECRET_SIG = "1b47061264138c4ac30d75fd1eb44270"


def is_secret(value) -> bool:
    return isinstance(value, dict) and value.get(_SIG_KEY) == _SECRET_SIG


def unsecret(value):
    """Strip secret wrappers (recursively) so plain values can be compared."""
    if is_secret(value):
        return unsecret(value["value"])
    if isinstance(value, dict):
        return {k: unsecret(v) for k, v in value.items()}
    if isinstance(value, list):
        return [unsecret(v) for v in value]
    return value


class RecordingMocks(pulumi.runtime.Mocks):
    def __init__(self):
        self.resources: list[pulumi.runtime.MockResourceArgs] = []
        self.calls: list[pulumi.runtime.MockCallArgs] = []

    def new_resource(self, args: pulumi.runtime.MockResourceArgs):
        self.resources.append(args)
        outputs = dict(args.inputs)
        t = args.typ
        if t == "eks:index:Cluster":
            outputs["kubeconfigJson"] = FAKE_KUBECONFIG
            outputs["eksCluster"] = {
                **_RESOURCE_REF_SIG,
                "urn": f"urn:pulumi:test::{PROJECT}::aws:eks/cluster:Cluster::{args.name}-eksCluster",
                "id": FAKE_EKS_CLUSTER_NAME,
            }
        elif t == "aws:ecr/repository:Repository":
            outputs["registryId"] = "123456789012"
            outputs["repositoryUrl"] = f"123456789012.dkr.ecr.us-east-1.amazonaws.com/{args.name}"
        elif t == "docker-build:index:Image":
            outputs["ref"] = FAKE_IMAGE_REF
        elif t == "nvidia-aicr:index:ClusterStack":
            outputs.update({
                "recipeName": "h100-eks-ubuntu-inference-dynamo",
                "recipeVersion": "v0.21.1",
                "deployedComponents": FAKE_COMPONENTS,
                "componentCount": len(FAKE_COMPONENTS),
                "criteria": {k: args.inputs.get(k) for k in
                             ("accelerator", "service", "intent", "os", "platform", "nodes", "skipComponents")},
            })
        elif t == "nvidia-aicr:index:ValidationRun":
            outputs.update({"status": "passed", "readinessMessage": "ok", "phaseResults": []})
        elif t == "kubernetes:core/v1:Service":
            outputs["status"] = {"loadBalancer": {"ingress": [{"hostname": FAKE_ELB_HOSTNAME}]}}
        elif t == "command:local:Command":
            outputs["stdout"] = "gate: ok"
        return [args.resource_id or f"{args.name}-id", outputs]

    def call(self, args: pulumi.runtime.MockCallArgs):
        self.calls.append(args)
        token = args.token
        if token == "aws:ec2/getVpc:getVpc":
            return {"id": "vpc-default"}
        if token == "aws:ec2/getSubnets:getSubnets":
            return {"ids": ["subnet-a", "subnet-b", "subnet-c"]}
        if token == "aws:ec2/getAmi:getAmi":
            return {"id": "ami-ubuntu-eks", "name": args.args["filters"][0]["values"][0]}
        if token == "aws:ecr/getAuthorizationToken:getAuthorizationToken":
            return {"proxyEndpoint": "https://123456789012.dkr.ecr.us-east-1.amazonaws.com",
                    "userName": "AWS", "password": "token"}
        return {}

    # --- helpers for tests -------------------------------------------------
    def of_type(self, typ: str) -> list[pulumi.runtime.MockResourceArgs]:
        return [r for r in self.resources if r.typ == typ]

    def one(self, typ: str, name: str | None = None) -> pulumi.runtime.MockResourceArgs:
        matches = [r for r in self.of_type(typ) if name is None or r.name == name]
        assert len(matches) == 1, f"expected exactly one {typ} {name or ''}, got {[r.name for r in matches]}"
        return matches[0]


BASE_CONFIG = {
    f"{PROJECT}:owner": "tester@example.com",
    f"{PROJECT}:instanceType": "g6.2xlarge",
    f"{PROJECT}:nodeCount": "2",
    f"{PROJECT}:model": "Qwen/Qwen2.5-1.5B-Instruct",
}


def run_program(extra_config: dict | None = None, secret_keys: list[str] | None = None) -> RecordingMocks:
    """Execute __main__.py under mocks and return the recorder once every
    resource registration has completed."""
    mocks = RecordingMocks()
    monitor = MockMonitor(mocks)
    # pulumi-eks exposes the underlying aws.eks.Cluster as a resource reference;
    # the mock monitor resolves references from its registry, so pre-register it.
    eks_urn = f"urn:pulumi:test::{PROJECT}::aws:eks/cluster:Cluster::aicr-chatbot-eksCluster"
    monitor.resources[eks_urn] = MockMonitor.ResourceRegistration(
        eks_urn, FAKE_EKS_CLUSTER_NAME, {"name": FAKE_EKS_CLUSTER_NAME})
    pulumi.runtime.set_mocks(mocks, project=PROJECT, stack="test", preview=False, monitor=monitor)
    pulumi.runtime.set_all_config({**BASE_CONFIG, **(extra_config or {})}, secret_keys=secret_keys)

    @pulumi.runtime.test
    def _run():
        runpy.run_path(str(INFRA / "__main__.py"), run_name="aicr_chatbot_program")

    _run()
    return mocks


@pytest.fixture(scope="module")
def program() -> RecordingMocks:
    """The default configuration: no HF token, no validation."""
    return run_program()


@pytest.fixture(scope="module")
def program_full() -> RecordingMocks:
    """Everything switched on: HF token secret and ValidationRun."""
    return run_program({f"{PROJECT}:hfToken": "hf_secret", f"{PROJECT}:validate": "true"},
                       secret_keys=[f"{PROJECT}:hfToken"])
