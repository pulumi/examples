"""EKS cluster with a self-managed GPU node group on Canonical's Ubuntu EKS AMI.

Why Ubuntu rather than the AWS GPU AMI: the AICR recipe pins os=ubuntu, and on
Ubuntu the GPU Operator manages the driver and container toolkit itself -- the
recipe-faithful arrangement. The AWS GPU AMI preinstalls a driver, which forces
gpu-operator overrides and fails the recipe's OS pre-flight in validation.

Why the default VPC: the sandbox account is at its VPC quota. Its subnets are
public with auto-assigned IPs, so nodes pull images without a NAT gateway.
"""

import json
from dataclasses import dataclass, field

import pulumi
import pulumi_aws as aws
import pulumi_eks as eks

# AZs where EKS control planes can live in us-east-1 (1e is not one). Breadth
# matters for GPU capacity: the ASG falls back across its subnets on
# InsufficientInstanceCapacity, and the EKS AZ set is immutable after creation.
EKS_AZS = ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d", "us-east-1f"]

CANONICAL_OWNER_ID = "099720109477"

# Policies for the node instance role. The last two are what the default
# pulumi-eks role lacks: ECR read for our chatbot image, and the EBS CSI policy
# because the recipe's aws-ebs-csi-driver runs with node-instance-role
# credentials (no IRSA in this demo) and crash-loops on ec2:Describe* without it.
NODE_POLICIES = {
    "worker": "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "cni": "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "ecr": "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    "ebs-csi": "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy",
}


@dataclass
class ClusterSpec:
    name: str
    instance_type: str
    node_count: int
    k8s_version: str
    owner: str
    root_volume_gb: int = 100
    extra_tags: dict = field(default_factory=dict)

    @property
    def tags(self) -> dict:
        return {"Owner": self.owner, **self.extra_tags}


def ubuntu_eks_ami_name_pattern(k8s_version: str) -> str:
    """Canonical's Ubuntu EKS AMI name pattern for a Kubernetes minor version.

    Pinned to the noble-24.04 codename rather than a bare wildcard: Canonical
    now publishes both 24.04 and 26.04 EKS AMIs for the same k8s version, and
    a wildcard combined with most_recent picks whichever is newest by
    creation date. NVIDIA's driver container registry (nvcr.io/nvidia/driver)
    has no 26.04 build yet, so that AMI's driver DaemonSet sits in
    ImagePullBackOff forever. 24.04 is the LTS the recipe's driver images
    actually support.
    """
    return f"ubuntu-eks/k8s_{k8s_version}/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"


def create_cluster(spec: ClusterSpec) -> eks.Cluster:
    default_vpc = aws.ec2.get_vpc(default=True)
    subnets = aws.ec2.get_subnets(
        filters=[
            aws.ec2.GetSubnetsFilterArgs(name="vpc-id", values=[default_vpc.id]),
            aws.ec2.GetSubnetsFilterArgs(name="availability-zone", values=EKS_AZS),
        ]
    )

    ubuntu_ami = aws.ec2.get_ami(
        owners=[CANONICAL_OWNER_ID],
        most_recent=True,
        filters=[
            aws.ec2.GetAmiFilterArgs(
                name="name",
                values=[ubuntu_eks_ami_name_pattern(spec.k8s_version)],
            )
        ],
    )

    # Our own node role (rather than the one pulumi-eks would create) so the
    # policy set is explicit and testable, and the role carries the Owner tag.
    node_role = aws.iam.Role(
        f"{spec.name}-node-role",
        assume_role_policy=json.dumps(
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": "sts:AssumeRole",
                        "Principal": {"Service": "ec2.amazonaws.com"},
                    }
                ],
            }
        ),
        tags=spec.tags,
    )
    for key, arn in NODE_POLICIES.items():
        aws.iam.RolePolicyAttachment(f"{spec.name}-node-{key}", role=node_role.name, policy_arn=arn)

    return eks.Cluster(
        spec.name,
        version=spec.k8s_version,
        vpc_id=default_vpc.id,
        subnet_ids=subnets.ids,
        instance_role=node_role,
        create_oidc_provider=True,
        tags=spec.tags,
        # All node settings live here: pulumi-eks forbids mixing them with the
        # top-level equivalents once any option (auto_scaling_group_tags) needs it.
        node_group_options=eks.ClusterNodeGroupOptionsArgs(
            instance_type=spec.instance_type,
            # ami_id and gpu are mutually exclusive in pulumi-eks. Ubuntu EKS
            # AMIs ship /etc/eks/bootstrap.sh, so the user data must be the
            # classic bootstrap.sh flavour: pulumi-eks picks that from
            # operating_system=AL2. Its default ("recommended") is AL2023, whose
            # nodeadm YAML user data Ubuntu's cloud-init ignores -- the nodes
            # boot but never join the cluster.
            ami_id=ubuntu_ami.id,
            operating_system=eks.OperatingSystem.AL2,
            # Driver build + ~17 platform images + the 10 GB Dynamo runtime image.
            node_root_volume_size=spec.root_volume_gb,
            desired_capacity=spec.node_count,
            min_size=spec.node_count,
            max_size=spec.node_count,
            node_associate_public_ip_address=True,
            # Cluster tags do not reach the ASG; the account reaper deletes
            # untagged ASGs, so stamp it directly.
            auto_scaling_group_tags=spec.tags,
        ),
    )


def kubeconfig(cluster: eks.Cluster) -> pulumi.Output[str]:
    """The cluster's kubeconfig as a secret output (it embeds the API endpoint and CA)."""
    return pulumi.Output.secret(cluster.kubeconfig_json)
