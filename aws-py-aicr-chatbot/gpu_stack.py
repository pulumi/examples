"""The AICR-validated GPU software stack: one ClusterStack resource.

Recipe: h100-eks-ubuntu-inference-dynamo. The provider admits no low-end GPU
value (l4/t4/a10g are rejected), so the H100 recipe runs on the L4 nodes -- the
same software path, only the validation floors are H100-calibrated.
"""

from dataclasses import dataclass, field

import pulumi
import pulumi_kubernetes as k8s
import pulumi_labs_nvidia_aicr as aicr

RFC1918 = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]

# Components the recipe ships that cannot work on this rig:
#   aws-efa: EFA/RDMA hardware exists only on P-family instances.
#   nodewright-customizations: taints every node NoSchedule until an H100-only
#     node tuning completes -- it never does here, which deadlocks all
#     scheduling, including Helm uninstall hooks, wedging `pulumi destroy`.
SKIPPED_COMPONENTS = ["aws-efa", "nodewright-customizations"]


@dataclass
class GpuStackSpec:
    node_count: int
    # The recipe's own inference-gateway creates an ELB. It is not on the demo
    # path (the chat app has its own load balancer), so restrict it to private
    # ranges rather than leave an unauthenticated public endpoint (the recipe
    # default is 0.0.0.0/0 when deployed outside the `aicr bundle` CLI).
    gateway_source_ranges: list = field(default_factory=lambda: list(RFC1918))


def deploy_gpu_stack(name: str, kubeconfig: pulumi.Input[str], spec: GpuStackSpec) -> aicr.ClusterStack:
    return aicr.ClusterStack(name,
        kubeconfig=kubeconfig,
        accelerator="h100",
        service="eks",
        intent="inference",
        platform="dynamo",
        os="ubuntu",
        nodes=spec.node_count,
        skip_components=list(SKIPPED_COMPONENTS),
        component_overrides={
            "agentgateway": aicr.ComponentOverrideArgs(
                values={"allowedSourceRanges": list(spec.gateway_source_ranges)},
            ),
        },
        # Don't block on readiness: with the H100-tuned recipe on L4 nodes some
        # workloads may never report Ready. The pieces we consume (Dynamo
        # operator, GPU capacity) are awaited explicitly by gate.py instead.
        skip_await=True,
    )


GATEWAY_NAMESPACE = "agentgateway-system"
GATEWAY_SERVICE = "inference-gateway"


def tag_gateway_load_balancer(name: str, owner: str, *, provider: k8s.Provider,
                              depends_on: list) -> k8s.core.v1.ServicePatch:
    """Stamp the Owner tag onto the ELB behind the recipe's inference-gateway.

    The agentgateway controller creates that Service (and the cloud controller
    its ELB) with only the cluster tags; the account reaper deletes untagged
    ELBs hourly and the controller recreates them. A server-side-apply patch
    adds the annotation without taking ownership of the Service.
    """
    return k8s.core.v1.ServicePatch(name,
        metadata={
            "name": GATEWAY_SERVICE,
            "namespace": GATEWAY_NAMESPACE,
            "annotations": {
                "service.beta.kubernetes.io/aws-load-balancer-additional-resource-tags": f"Owner={owner}",
            },
        },
        opts=pulumi.ResourceOptions(provider=provider, depends_on=list(depends_on)),
    )


def validate_gpu_stack(name: str, stack: aicr.ClusterStack, kubeconfig: pulumi.Input[str],
                       *, depends_on: list | None = None) -> aicr.ValidationRun:
    """Opt-in empirical validation. Expect a MIXED verdict on L4: the recipe is
    H100-tuned and two components are skipped by design. The performance phase
    is excluded because its throughput floor is calibrated on 8x H100.
    Pass the gate in depends_on so the validator starts once GPU nodes exist."""
    return aicr.ValidationRun(name,
        criteria=stack.criteria,                    # exactly the recipe (and skips) deployed
        recipe_data_version=stack.recipe_version,   # assert the same recipe data
        kubeconfig=kubeconfig,
        phases=["deployment", "conformance"],
        strict=False,
        require_gpu=True,
        triggers=[stack.deployed_components],       # re-validate when the stack changes
        opts=pulumi.ResourceOptions(depends_on=[stack, *(depends_on or [])]),
    )
