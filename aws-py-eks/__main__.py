import iam
import vpc
import utils
import pulumi
import pulumi_aws as aws
from pulumi_aws import eks

provider = aws.Provider('provider', region='us-west-2')

## EKS Cluster
with pulumi.default_providers([provider]):
    ec2_role, eks_role = iam.setup_iam()
    eks_security_group, subnet_ids = vpc.vpc()
    eks_cluster = eks.Cluster(
        'eks-cluster',
        role_arn=eks_role.arn,
        tags={
            'Name': 'pulumi-eks-cluster',
        },
        vpc_config=eks.ClusterVpcConfigArgs(
            public_access_cidrs=['0.0.0.0/0'],
            security_group_ids=[eks_security_group.id],
            subnet_ids=subnet_ids,
        ),
    )

    eks_node_group = eks.NodeGroup(
        'eks-node-group',
        cluster_name=eks_cluster.name,
        node_group_name='pulumi-eks-nodegroup',
        node_role_arn=ec2_role.arn,
        subnet_ids=subnet_ids,
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
