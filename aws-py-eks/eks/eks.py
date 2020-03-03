import os
from pulumi import Input, Output, ResourceOptions
from pulumi.remote import ProxyComponentResource
from pulumi.runtime import register_proxy_constructor
from pulumi_aws import eks, ec2, iam, cloudformation
from pulumi_kubernetes import Provider, core
from pulumi_kubernetes.core.v1 import ConfigMap
from typing import Any, Optional, List, Dict

# TODO: Passing `id` here is a hack that is needed until the AWS library is updated to handle `urn`
# opts.  For now, we trick it into doing almost the right thing by passing `id` as well, though this
# also causes output properties to not get populated correctly.
# TODO: This belongs in the AWS package.
register_proxy_constructor("aws:eks/cluster:Cluster", lambda name, opts: eks.Cluster(name, opts=ResourceOptions(**opts)))
register_proxy_constructor("aws:ec2/securityGroup:SecurityGroup", lambda name, opts: ec2.SecurityGroup(name, opts=ResourceOptions(**opts)))
register_proxy_constructor("aws:ec2/securityGroupRule:SecurityGroupRule", lambda name, opts: ec2.SecurityGroupRule(name, opts=ResourceOptions(**opts)))
register_proxy_constructor("aws:iam/role:Role", lambda name, opts: iam.Role(name, opts=ResourceOptions(**opts)))
register_proxy_constructor("aws:iam/instanceProfile:InstanceProfile", lambda name, opts: iam.InstanceProfile(name, opts=ResourceOptions(**opts)))
register_proxy_constructor("aws:cloudformation/stack:Stack", lambda name, opts: cloudformation.Stack(name, opts=ResourceOptions(**opts)))
register_proxy_constructor("kubernetes:core/v1:ConfigMap", lambda name, opts: ConfigMap(name, opts=ResourceOptions(**opts)))
register_proxy_constructor("pulumi:providers:kubernetes", lambda name, opts: Provider(name))

class Cluster(ProxyComponentResource):
    kubeconfig: Output[Any]
    eksCluster: eks.Cluster
    provider: Provider
    clusterSecurityGroup: ec2.SecurityGroup
    instanceRoles: Output[List[iam.Role]]
    nodeSecurityGroup: ec2.SecurityGroup
    eksClusterIngressRule: ec2.SecurityGroupRule
    defaultNodeGroup: Optional[Dict[str, Any]]
    core: Dict[str, Any]
    def __init__(
            __self__, 
            resource_name: str,
            opts: Optional[ResourceOptions]=None, 
            deploy_dashboard:Optional[bool]=None,
            vpc_id:Optional[Input[str]]=None,
            subnet_ids:Optional[Input[List[Input[str]]]]=None,
            public_subnet_ids:Optional[Input[List[Input[str]]]]=None,
            private_subnet_ids:Optional[Input[List[Input[str]]]]=None,
            skip_default_node_group:Optional[bool]=None,
            tags:Optional[Input[Dict[str,Input[str]]]]=None,
            # nodeGroupOptions?: ClusterNodeGroupOptions;
            # nodeAssociatePublicIpAddress?: boolean;
            # roleMappings?: pulumi.Input<pulumi.Input<RoleMapping>[]>;
            # userMappings?: pulumi.Input<pulumi.Input<UserMapping>[]>;
            # vpcCniOptions?: VpcCniOptions;
            # instanceType?: pulumi.Input<aws.ec2.InstanceType>;
            # instanceRole?: pulumi.Input<aws.iam.Role>;
            # instanceProfileName?: pulumi.Input<string>;
            # serviceRole?: pulumi.Input<aws.iam.Role>;
            # creationRoleProvider?: CreationRoleProvider;
            # instanceRoles?: pulumi.Input<pulumi.Input<aws.iam.Role>[]>;
            # customInstanceRolePolicy?: pulumi.Input<string>;
            # nodeAmiId?: pulumi.Input<string>;
            # nodePublicKey?: pulumi.Input<string>;
            # nodeSubnetIds?: pulumi.Input<pulumi.Input<string>[]>;
            # clusterSecurityGroup?: aws.ec2.SecurityGroup;
            # clusterSecurityGroupTags?: InputTags;
            # nodeSecurityGroupTags?: InputTags;
            # nodeRootVolumeSize?: pulumi.Input<number>;
            # nodeUserData?: pulumi.Input<string>;
            # desiredCapacity?: pulumi.Input<number>;
            # minSize?: pulumi.Input<number>;
            # maxSize?: pulumi.Input<number>;
            # storageClasses?: {
            #     [name: string]: StorageClass;
            # } | EBSVolumeType;
            # skipDefaultNodeGroup?: boolean;
            # deployDashboard?: boolean;
            # version?: pulumi.Input<string>;
            # enabledClusterLogTypes?: pulumi.Input<pulumi.Input<string>[]>;
            # endpointPublicAccess?: boolean;
            # endpointPrivateAccess?: boolean;
            # fargate?: boolean | FargateProfile;
        ) -> None:
        super().__init__(
            "eks:index:Cluster",
            resource_name,
            os.path.abspath(os.path.join(os.path.dirname(__file__), "node_modules", "@pulumi", "eks")),
            "Cluster",
            {
                "vpcId": vpc_id,
                "subnetIds": subnet_ids,
                "publicSubnetIds": public_subnet_ids,
                "privateSubnetIds": private_subnet_ids,
                "deployDashboard": deploy_dashboard,
                "skipDefaultNodeGroup": skip_default_node_group,
                "tags": tags,
            },
            {
                "kubeconfig": None,
                "eksCluster": None,
                "provider": None,
                "clusterSecurityGroup": None,
                "instanceRoles": None,
                "nodeSecurityGroup": None,
                "eksClusterIngressRule": None,
                "defaultNodeGroup": None,
                "core": None,
            },
            opts,
        )
register_proxy_constructor("eks:index:Cluster", Cluster)
