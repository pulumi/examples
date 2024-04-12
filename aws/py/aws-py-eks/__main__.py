import iam
import vpc
import utils
import pulumi
from pulumi_aws import eks

## EKS Cluster

eks_cluster = eks.Cluster(
    'eks-cluster',
    role_arn=iam.eks_role.arn,
    tags={
        'Name': 'pulumi-eks-cluster',
    },
    vpc_config=eks.ClusterVpcConfigArgs(
        public_access_cidrs=['0.0.0.0/0'],
        security_group_ids=[vpc.eks_security_group.id],
        subnet_ids=vpc.subnet_ids,
    ),
)

eks_node_group = eks.NodeGroup(
    'eks-node-group',
    cluster_name=eks_cluster.name,
    node_group_name='pulumi-eks-nodegroup',
    node_role_arn=iam.ec2_role.arn,
    subnet_ids=vpc.subnet_ids,
    tags={
        'Name': 'pulumi-cluster-nodeGroup',
    },
    scaling_config=eks.NodeGroupScalingConfigArgs(
        desired_size=2,
        max_size=2,
        min_size=1,
    ),
)

pulumi.export('cluster-name', eks_cluster.name)
pulumi.export('kubeconfig', utils.generate_kube_config(eks_cluster))
