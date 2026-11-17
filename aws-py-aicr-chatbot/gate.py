"""Readiness gate: an explicit wait between the ClusterStack and the model.

See wait-for-dynamo.sh for what is awaited and why. This is the one imperative
step in the program; its only job is ordering. It re-runs whenever the set of
deployed components changes.
"""

import os

import pulumi
import pulumi_command as command

HERE = os.path.dirname(os.path.abspath(__file__))


def release_volumes_on_destroy(name: str, kubeconfig: pulumi.Input[str], *,
                               depends_on: list) -> command.local.Command:
    """A destroy-time hook: delete every PVC while the EBS CSI driver still runs.

    Pulumi deletes dependents first, so a Command that depends on the
    ClusterStack has its `delete` run before the stack's Helm releases are
    uninstalled. See release-pvcs.sh. `create` is a no-op.
    """
    return command.local.Command(name,
        create="true",
        delete="bash ./release-pvcs.sh",
        dir=HERE,
        environment={"KUBECONFIG_JSON": kubeconfig},
        opts=pulumi.ResourceOptions(depends_on=depends_on),
    )


def wait_for_dynamo(name: str, kubeconfig: pulumi.Input[str], *, min_gpu_nodes: int,
                    depends_on: list, triggers: list) -> command.local.Command:
    return command.local.Command(name,
        create="bash ./wait-for-dynamo.sh",
        dir=HERE,
        environment={
            "KUBECONFIG_JSON": kubeconfig,
            "MIN_GPU_NODES": str(min_gpu_nodes),
        },
        triggers=triggers,
        opts=pulumi.ResourceOptions(depends_on=depends_on),
    )
