using System.Collections.Generic;
using Pulumi;
using Pulumi.Aws.Eks.Inputs;
using Pulumi.Kubernetes.Types.Inputs.Apps.V1;
using Pulumi.Kubernetes.Types.Inputs.Core.V1;
using Pulumi.Kubernetes.Types.Inputs.Meta.V1;
using Ec2 = Pulumi.Aws.Ec2;
using Iam = Pulumi.Aws.Iam;
using Eks = Pulumi.Aws.Eks;
using K8s = Pulumi.Kubernetes;
using CoreV1 = Pulumi.Kubernetes.Core.V1;
using AppsV1 = Pulumi.Kubernetes.Apps.V1;

class EksStack : Stack
{
    private Output<string> GenerateKubeconfig(Output<string> clusterEndpoint, Output<string> certData,
        Output<string> clusterName)
    {
        return Output.Format($@"{{
        ""apiVersion"": ""v1"",
        ""clusters"": [{{
            ""cluster"": {{
                ""server"": ""{clusterEndpoint}"",
                ""certificate-authority-data"": ""{certData}""
            }},
            ""name"": ""kubernetes"",
        }}],
        ""contexts"": [{{
            ""context"": {{
                ""cluster"": ""kubernetes"",
                ""user"": ""aws"",
            }},
            ""name"": ""aws"",
        }}],
        ""current-context"": ""aws"",
        ""kind"": ""Config"",
        ""users"": [{{
            ""name"": ""aws"",
            ""user"": {{
                ""exec"": {{
                    ""apiVersion"": ""client.authentication.k8s.io/v1beta1"",
                    ""command"": ""aws-iam-authenticator"",
                    ""args"": [
                        ""token"",
                        ""-i"",
                        ""{clusterName}"",
                    ],
                }},
            }},
        }}],
    }}");
    }

    public EksStack()
    {
        // Read back the default VPC and public subnets, which we will use.
        var vpcId = Ec2.GetVpc.Invoke(new Ec2.GetVpcInvokeArgs { Default = true })
            .Apply(vpc => vpc.Id);

        var subnetIds = Ec2.GetSubnets.Invoke(new Ec2.GetSubnetsInvokeArgs
        {
            Filters = {
                new Ec2.Inputs.GetSubnetsFilterInputArgs { Name = "vpc-id", Values = {vpcId} }
            },
        }).Apply(s => s.Ids);

        // Create an IAM role that can be used by our service's task.
        var eksRole = new Iam.Role("eks-iam-eksRole", new Iam.RoleArgs
        {
            AssumeRolePolicy = @"{
""Version"": ""2008-10-17"",
""Statement"": [{
    ""Sid"": """",
    ""Effect"": ""Allow"",
    ""Principal"": {
        ""Service"": ""eks.amazonaws.com""
    },
    ""Action"": ""sts:AssumeRole""
}]
}"
        });

        var eksPolicies = new Dictionary<string, string>
        {
            {"service-policy", "arn:aws:iam::aws:policy/AmazonEKSServicePolicy"},
            {"cluster-policy", "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"}
        };

        foreach (var (name, policy) in eksPolicies)
        {
            var taskExecAttach = new Iam.RolePolicyAttachment($"rpa-{name}",
                new Iam.RolePolicyAttachmentArgs
                {
                    Role = eksRole.Name,
                    PolicyArn = policy,
                });
        }

        // Create an IAM role that can be used by our service's task.
        var nodeGroupRole = new Iam.Role("nodegroup-iam-role", new Iam.RoleArgs
        {
            AssumeRolePolicy = @"{
""Version"": ""2008-10-17"",
""Statement"": [{
    ""Sid"": """",
    ""Effect"": ""Allow"",
    ""Principal"": {
        ""Service"": ""ec2.amazonaws.com""
    },
    ""Action"": ""sts:AssumeRole""
}]
}"
        });

        var nodeGroupPolicies = new Dictionary<string, string>
        {
            { "worker", "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy" },
            { "cni", "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy" },
            { "registry", "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly" }
        };
        foreach (var (name, policy) in nodeGroupPolicies)
        {
            var taskExecAttach = new Iam.RolePolicyAttachment($"ngpa-{name}",
                new Iam.RolePolicyAttachmentArgs
                {
                    Role = nodeGroupRole.Name,
                    PolicyArn = policy,
                });
        }

        var clusterSg = new Ec2.SecurityGroup("cluster-sg", new Ec2.SecurityGroupArgs
        {
            VpcId = vpcId,
            Egress =
            {
                new Ec2.Inputs.SecurityGroupEgressArgs
                {
                    Protocol = "-1",
                    FromPort = 0,
                    ToPort = 0,
                    CidrBlocks = {"0.0.0.0/0"}
                }
            },
            Ingress =
            {
                new Ec2.Inputs.SecurityGroupIngressArgs
                {
                    Protocol = "tcp",
                    FromPort = 80,
                    ToPort = 80,
                    CidrBlocks = {"0.0.0.0/0"}
                }
            }
        });

        var cluster = new Eks.Cluster("eks-cluster", new Eks.ClusterArgs
        {
            RoleArn = eksRole.Arn,
            VpcConfig = new ClusterVpcConfigArgs
            {
                PublicAccessCidrs =
                {
                    "0.0.0.0/0",
                },
                SecurityGroupIds =
                {
                    clusterSg.Id,
                },
                SubnetIds = subnetIds,
            },
        });

        var nodeGroup = new Eks.NodeGroup("node-group", new Eks.NodeGroupArgs
        {
            ClusterName = cluster.Name,
            NodeGroupName = "demo-eks-nodegroup",
            NodeRoleArn = nodeGroupRole.Arn,
            SubnetIds = subnetIds,
            ScalingConfig = new NodeGroupScalingConfigArgs
            {
                DesiredSize = 2,
                MaxSize = 2,
                MinSize = 2
            },
        });

        this.Kubeconfig = GenerateKubeconfig(cluster.Endpoint,
            cluster.CertificateAuthority.Apply(x => x.Data ?? ""),
            cluster.Name);

        var k8sProvider = new K8s.Provider("k8s-provider", new K8s.ProviderArgs
        {
            KubeConfig = this.Kubeconfig
        }, new CustomResourceOptions
        {
            DependsOn = {nodeGroup},
        });

        var appNamespace = new CoreV1.Namespace("app-ns", new NamespaceArgs
        {
            Metadata = new ObjectMetaArgs
            {
                Name = "joe-duffy",
            },
        }, new CustomResourceOptions
        {
            Provider = k8sProvider,
        });

        var appLabels = new InputMap<string>
        {
            {"app", "iac-workshop"}
        };
        var deployment = new AppsV1.Deployment("app-dep", new DeploymentArgs
        {
            Metadata = new ObjectMetaArgs
            {
                Namespace = appNamespace.Metadata.Apply(x => x.Name),
            },
            Spec = new DeploymentSpecArgs
            {
                Selector = new LabelSelectorArgs
                {
                    MatchLabels = appLabels
                },
                Replicas = 1,
                Template = new PodTemplateSpecArgs
                {
                    Metadata = new ObjectMetaArgs
                    {
                        Labels = appLabels
                    },
                    Spec = new PodSpecArgs
                    {
                        Containers =
                        {
                            new ContainerArgs
                            {
                                Name = "iac-workshop",
                                Image = "jocatalin/kubernetes-bootcamp:v2",
                            }
                        }
                    }
                }
            },
        }, new CustomResourceOptions
        {
            Provider = k8sProvider,
        });

        var service = new CoreV1.Service("app-service", new ServiceArgs
        {
            Metadata = new ObjectMetaArgs
            {
                Namespace = appNamespace.Metadata.Apply(x=>x.Name),
                Labels = deployment.Spec.Apply(spec => spec.Template.Metadata.Labels),
            },
            Spec = new ServiceSpecArgs
            {
                Type = "LoadBalancer",
                Ports =
                {
                    new ServicePortArgs
                    {
                        Port = 80,
                        TargetPort = 8080
                    },
                },
                Selector = deployment.Spec.Apply(spec => spec.Template.Metadata.Labels)
            },
        }, new CustomResourceOptions
        {
            Provider = k8sProvider,
        });

        this.Url = service.Status.Apply(status => status.LoadBalancer.Ingress[0].Hostname);
    }

    [Output] public Output<string> Kubeconfig { get; set; }
    [Output] public Output<string> Url { get; set; }
}
