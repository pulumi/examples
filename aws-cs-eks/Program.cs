// Copyright 2016-2022, Pulumi Corporation.
using System.Collections.Generic;
using System.Text.Json.Nodes;

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

await Deployment.RunAsync(() =>
{
    // Read back the default VPC and public subnets, which we will use.
    var vpc = Ec2.GetVpc.Invoke(new Ec2.GetVpcInvokeArgs { Default = true });
    var vpcId = vpc.Apply(result => result.Id);

    var subnets = Ec2.GetSubnetIds.Invoke(new Ec2.GetSubnetIdsInvokeArgs
    {
        VpcId = vpcId
    });

    var subnetIds = subnets.Apply(s => s.Ids);

    // Create an IAM role that can be used by our service's task.
    var eksRole = new Iam.Role("eks-iam-eksRole", new Iam.RoleArgs
    {
        AssumeRolePolicy = new JsonObject
        {
            ["Version"] = "2008-10-17",
            ["Statement"] = new JsonArray
            {
                new JsonObject
                {
                    ["Sid"] = "",
                    ["Effect"] = "Allow",
                    ["Action"] = "sts:AssumeRole",
                    ["Principal"] = new JsonObject { ["Service"] = "eks.amazonaws.com" }
                }
            }
        }.ToJsonString()
    });

    var eksPolicies = new Dictionary<string, string>
    {
        {"service-policy", "arn:aws:iam::aws:policy/AmazonEKSServicePolicy"},
        {"cluster-policy", "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"}
    };

    foreach (var (name, policy) in eksPolicies)
    {
        var taskExecAttach = new Iam.RolePolicyAttachment($"rpa-{name}", new Iam.RolePolicyAttachmentArgs
        {
            Role = eksRole.Name,
            PolicyArn = policy,
        });
    }

    // Create an IAM role that can be used by our service's task.
    var nodeGroupRole = new Iam.Role("nodegroup-iam-role", new Iam.RoleArgs
    {
        AssumeRolePolicy = new JsonObject
        {
            ["Version"] = "2008-10-17",
            ["Statement"] = new JsonArray
            {
                new JsonObject
                {
                    ["Sid"] = "",
                    ["Effect"] = "Allow",
                    ["Action"] = "sts:AssumeRole",
                    ["Principal"] = new JsonObject { ["Service"] = "ec2.amazonaws.com" }
                }
            }
        }.ToJsonString(),
    });

    var nodeGroupPolicies = new Dictionary<string, string>
    {
        { "worker", "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy" },
        { "cni", "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy" },
        { "registry", "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly" }
    };
    
    foreach (var (name, policy) in nodeGroupPolicies)
    {
        var taskExecAttach = new Iam.RolePolicyAttachment($"ngpa-{name}", new Iam.RolePolicyAttachmentArgs
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
           PublicAccessCidrs = { "0.0.0.0/0" },
           SecurityGroupIds = { clusterSg.Id },
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

    var kubeconfig = GenerateKubeconfig(cluster.Endpoint,
        cluster.CertificateAuthority.Apply(x => x.Data ?? ""),
        cluster.Name);

    var k8sProvider = new K8s.Provider("k8s-provider", new K8s.ProviderArgs
    {
        KubeConfig = kubeconfig
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

    return new Dictionary<string, object?>
    {
        ["kubeconfig"] = kubeconfig,
        ["url"] = service.Status.Apply(status => status.LoadBalancer.Ingress[0].Hostname)
    };
});


Output<string> GenerateKubeconfig(Output<string> clusterEndpoint, Output<string> certData, Output<string> clusterName)
{
    return Output.Tuple(clusterEndpoint, certData, clusterName).Apply(outputs =>
    {
        var clusterEndpointContent = outputs.Item1;
        var certDataContent = outputs.Item2;
        var clusterNameContent = outputs.Item3;
        var kubeconfig = new JsonObject
        {
            ["apiVersion"] = "v1",
            ["clusters"] = new JsonArray
            {
                new JsonObject
                {
                    ["name"] = "kubernetes",
                    ["cluster"] = new JsonObject
                    {
                        ["server"] = clusterEndpointContent,
                        ["certificate-authority-data"] = certDataContent
                    }       
                }
            },
            
            ["contexts"] = new JsonArray
            {
                new JsonObject
                {
                    ["name"] = "aws",
                    ["context"] = new JsonObject
                    {
                        ["cluster"] = "kubernetes",
                        ["user"] = "aws"
                    }
                }
            },
            
            ["current-context"] = "aws",
            ["kind"] = "Config",
            ["users"] = new JsonArray
            {
                new JsonObject
                {
                    ["name"] = "aws",
                    ["user"] = new JsonObject
                    {
                        ["exec"] = new JsonObject
                        {
                            ["apiVersion"] = "client.authentication.k8s.io/v1alpha1",
                            ["command"] = "aws-iam-authenticator",
                            ["args"] = new JsonArray { "token", "-1", clusterNameContent }
                        }
                    }
                }
            }
        };

        return kubeconfig.ToJsonString();
    });
}
