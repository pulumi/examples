using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using Pulumi;
using Aws = Pulumi.Aws;
using Docker = Pulumi.Docker;

return await Deployment.RunAsync(() => 
{
    var config = new Config();
    var vpcCidr = config.Get("vpc-cidr") ?? "10.0.0.0/16";
    var subnet1Cidr = config.Get("subnet-1-cidr") ?? "10.0.0.0/24";
    var subnet2Cidr = config.Get("subnet-2-cidr") ?? "10.0.1.0/24";
    var containerContext = config.Get("container-context") ?? ".";
    var containerFile = config.Get("container-file") ?? "./Dockerfile";
    var openApiKey = config.Get("open-api-key") ?? "CHANGEME";
    var availabilityZones = new[]
    {
        "eu-central-1a",
        "eu-central-1b",
    };

    var current = Aws.GetCallerIdentity.Invoke();

    var pulumiProject = Deployment.Instance.ProjectName;

    var pulumiStack = Deployment.Instance.StackName;

    var langserveEcrRepository = new Aws.Ecr.Repository("langserve-ecr-repository", new()
    {
        Name = $"{pulumiProject}-{pulumiStack}",
        ForceDelete = true,
    });

    var token = Aws.Ecr.GetAuthorizationToken.Invoke(new()
    {
        RegistryId = langserveEcrRepository.RegistryId,
    });

    var accountId = current.Apply(getCallerIdentityResult => getCallerIdentityResult.AccountId);

    var langserveEcrLifeCyclePolicy = new Aws.Ecr.LifecyclePolicy("langserve-ecr-life-cycle-policy", new()
    {
        Repository = langserveEcrRepository.Name,
        Policy = JsonSerializer.Serialize(new Dictionary<string, object?>
        {
            ["rules"] = new[]
            {
                new Dictionary<string, object?>
                {
                    ["rulePriority"] = 1,
                    ["description"] = "Expire images when they are more than 10 available",
                    ["selection"] = new Dictionary<string, object?>
                    {
                        ["tagStatus"] = "any",
                        ["countType"] = "imageCountMoreThan",
                        ["countNumber"] = 10,
                    },
                    ["action"] = new Dictionary<string, object?>
                    {
                        ["type"] = "expire",
                    },
                },
            },
        }),
    });

    var langserveEcrImage = new Docker.Image("langserve-ecr-image", new()
    {
        Build = new Docker.Inputs.DockerBuildArgs
        {
            Platform = "linux/amd64",
            Context = containerContext,
            Dockerfile = containerFile,
        },
        ImageName = langserveEcrRepository.RepositoryUrl,
        Registry = new Docker.Inputs.RegistryArgs
        {
            Server = langserveEcrRepository.RepositoryUrl,
            Username = token.Apply(getAuthorizationTokenResult => getAuthorizationTokenResult.UserName),
            Password = Output.CreateSecret(token.Apply(getAuthorizationTokenResult => getAuthorizationTokenResult.Password)),
        },
    });

    var langserveVpc = new Aws.Ec2.Vpc("langserve-vpc", new()
    {
        CidrBlock = vpcCidr,
        EnableDnsHostnames = true,
        EnableDnsSupport = true,
        InstanceTenancy = "default",
        Tags = 
        {
            { "Name", $"{pulumiProject}-{pulumiStack}" },
        },
    });

    var langserveRt = new Aws.Ec2.RouteTable("langserve-rt", new()
    {
        VpcId = langserveVpc.Id,
        Tags = 
        {
            { "Name", $"{pulumiProject}-{pulumiStack}" },
        },
    });

    var langserveIgw = new Aws.Ec2.InternetGateway("langserve-igw", new()
    {
        VpcId = langserveVpc.Id,
        Tags = 
        {
            { "Name", $"{pulumiProject}-{pulumiStack}" },
        },
    });

    var langserveRoute = new Aws.Ec2.Route("langserve-route", new()
    {
        RouteTableId = langserveRt.Id,
        DestinationCidrBlock = "0.0.0.0/0",
        GatewayId = langserveIgw.Id,
    });

    var langserveSubnet1 = new Aws.Ec2.Subnet("langserve-subnet1", new()
    {
        VpcId = langserveVpc.Id,
        CidrBlock = subnet1Cidr,
        AvailabilityZone = availabilityZones[0],
        MapPublicIpOnLaunch = true,
        Tags = 
        {
            { "Name", $"{pulumiProject}-{pulumiStack}-1" },
        },
    });

    var langserveSubnet2 = new Aws.Ec2.Subnet("langserve-subnet2", new()
    {
        VpcId = langserveVpc.Id,
        CidrBlock = subnet2Cidr,
        AvailabilityZone = availabilityZones[1],
        MapPublicIpOnLaunch = true,
        Tags = 
        {
            { "Name", $"{pulumiProject}-{pulumiStack}-2" },
        },
    });

    var langserveSubnet1RtAssoc = new Aws.Ec2.RouteTableAssociation("langserve-subnet1-rt-assoc", new()
    {
        SubnetId = langserveSubnet1.Id,
        RouteTableId = langserveRt.Id,
    });

    var langserveSubnet2RtAssoc = new Aws.Ec2.RouteTableAssociation("langserve-subnet2-rt-assoc", new()
    {
        SubnetId = langserveSubnet2.Id,
        RouteTableId = langserveRt.Id,
    });

    var langserveEcsCluster = new Aws.Ecs.Cluster("langserve-ecs-cluster", new()
    {
        Configuration = new Aws.Ecs.Inputs.ClusterConfigurationArgs
        {
            ExecuteCommandConfiguration = new Aws.Ecs.Inputs.ClusterConfigurationExecuteCommandConfigurationArgs
            {
                Logging = "DEFAULT",
            },
        },
        Settings = new[]
        {
            new Aws.Ecs.Inputs.ClusterSettingArgs
            {
                Name = "containerInsights",
                Value = "disabled",
            },
        },
        Tags = 
        {
            { "Name", $"{pulumiProject}-{pulumiStack}" },
        },
    });

    var langserveClusterCapacityProviders = new Aws.Ecs.ClusterCapacityProviders("langserve-cluster-capacity-providers", new()
    {
        ClusterName = langserveEcsCluster.Name,
        CapacityProviders = new[]
        {
            "FARGATE",
            "FARGATE_SPOT",
        },
    });

    var langserveSecurityGroup = new Aws.Ec2.SecurityGroup("langserve-security-group", new()
    {
        VpcId = langserveVpc.Id,
        Ingress = new[]
        {
            new Aws.Ec2.Inputs.SecurityGroupIngressArgs
            {
                Protocol = "tcp",
                FromPort = 80,
                ToPort = 80,
                CidrBlocks = new[]
                {
                    "0.0.0.0/0",
                },
            },
        },
        Egress = new[]
        {
            new Aws.Ec2.Inputs.SecurityGroupEgressArgs
            {
                Protocol = "-1",
                FromPort = 0,
                ToPort = 0,
                CidrBlocks = new[]
                {
                    "0.0.0.0/0",
                },
            },
        },
    });

    var langserveLoadBalancer = new Aws.LB.LoadBalancer("langserve-load-balancer", new()
    {
        LoadBalancerType = "application",
        SecurityGroups = new[]
        {
            langserveSecurityGroup.Id,
        },
        Subnets = new[]
        {
            langserveSubnet1.Id,
            langserveSubnet2.Id,
        },
    });

    var langserveTargetGroup = new Aws.LB.TargetGroup("langserve-target-group", new()
    {
        Port = 80,
        Protocol = "HTTP",
        TargetType = "ip",
        VpcId = langserveVpc.Id,
    });

    var langserveListener = new Aws.LB.Listener("langserve-listener", new()
    {
        LoadBalancerArn = langserveLoadBalancer.Arn,
        Port = 80,
        Protocol = "HTTP",
        DefaultActions = new[]
        {
            new Aws.LB.Inputs.ListenerDefaultActionArgs
            {
                Type = "forward",
                TargetGroupArn = langserveTargetGroup.Arn,
            },
        },
    });

    var langserveLogGroup = new Aws.CloudWatch.LogGroup("langserve-log-group", new()
    {
        RetentionInDays = 7,
    });

    var langserveKey = new Aws.Kms.Key("langserve-key", new()
    {
        Description = "Key for encrypting secrets",
        EnableKeyRotation = true,
        Policy = Output.Tuple(accountId, accountId).Apply(values =>
        {
            var accountId = values.Item1;
            var accountId1 = values.Item2;
            return JsonSerializer.Serialize(new Dictionary<string, object?>
            {
                ["Version"] = "2012-10-17",
                ["Statement"] = new[]
                {
                    new Dictionary<string, object?>
                    {
                        ["Effect"] = "Allow",
                        ["Principal"] = new Dictionary<string, object?>
                        {
                            ["AWS"] = $"arn:aws:iam::{accountId}:root",
                        },
                        ["Action"] = new[]
                        {
                            "kms:Create*",
                            "kms:Describe*",
                            "kms:Enable*",
                            "kms:List*",
                            "kms:Put*",
                            "kms:Update*",
                            "kms:Revoke*",
                            "kms:Disable*",
                            "kms:Get*",
                            "kms:Delete*",
                            "kms:ScheduleKeyDeletion",
                            "kms:CancelKeyDeletion",
                            "kms:Tag*",
                            "kms:UntagResource",
                        },
                        ["Resource"] = "*",
                    },
                    new Dictionary<string, object?>
                    {
                        ["Effect"] = "Allow",
                        ["Principal"] = new Dictionary<string, object?>
                        {
                            ["AWS"] = $"arn:aws:iam::{accountId1}:root",
                        },
                        ["Action"] = new[]
                        {
                            "kms:Encrypt",
                            "kms:Decrypt",
                            "kms:ReEncrypt*",
                            "kms:GenerateDataKey*",
                            "kms:DescribeKey",
                        },
                        ["Resource"] = "*",
                    },
                },
            });
        }),
        Tags = 
        {
            { "pulumi-application", pulumiProject },
            { "pulumi-environment", pulumiStack },
        },
    });

    var langserveSsmParameter = new Aws.Ssm.Parameter("langserve-ssm-parameter", new()
    {
        Type = "SecureString",
        Value = openApiKey,
        KeyId = langserveKey.KeyId,
        Name = $"/pulumi/{pulumiProject}/{pulumiStack}/OPENAI_API_KEY",
        Tags = 
        {
            { "pulumi-application", pulumiProject },
            { "pulumi-environment", pulumiStack },
        },
    });

    var langserveExecutionRole = new Aws.Iam.Role("langserve-execution-role", new()
    {
        AssumeRolePolicy = JsonSerializer.Serialize(new Dictionary<string, object?>
        {
            ["Statement"] = new[]
            {
                new Dictionary<string, object?>
                {
                    ["Action"] = "sts:AssumeRole",
                    ["Effect"] = "Allow",
                    ["Principal"] = new Dictionary<string, object?>
                    {
                        ["Service"] = "ecs-tasks.amazonaws.com",
                    },
                },
            },
            ["Version"] = "2012-10-17",
        }),
        InlinePolicies = new[]
        {
            new Aws.Iam.Inputs.RoleInlinePolicyArgs
            {
                Name = $"{pulumiProject}-{pulumiStack}-service-secrets-policy",
                Policy = Output.Tuple(langserveSsmParameter.Arn, langserveKey.Arn).Apply(values =>
                {
                    var langserveSsmParameterArn = values.Item1;
                    var langserveKeyArn = values.Item2;
                    return JsonSerializer.Serialize(new Dictionary<string, object?>
                    {
                        ["Version"] = "2012-10-17",
                        ["Statement"] = new[]
                        {
                            new Dictionary<string, object?>
                            {
                                ["Action"] = new[]
                                {
                                    "ssm:GetParameters",
                                },
                                ["Condition"] = new Dictionary<string, object?>
                                {
                                    ["StringEquals"] = new Dictionary<string, object?>
                                    {
                                        ["ssm:ResourceTag/pulumi-application"] = pulumiProject,
                                        ["ssm:ResourceTag/pulumi-environment"] = pulumiStack,
                                    },
                                },
                                ["Effect"] = "Allow",
                                ["Resource"] = new[]
                                {
                                    langserveSsmParameterArn,
                                },
                            },
                            new Dictionary<string, object?>
                            {
                                ["Action"] = new[]
                                {
                                    "kms:Decrypt",
                                },
                                ["Condition"] = new Dictionary<string, object?>
                                {
                                    ["StringEquals"] = new Dictionary<string, object?>
                                    {
                                        ["aws:ResourceTag/pulumi-application"] = pulumiProject,
                                        ["aws:ResourceTag/pulumi-environment"] = pulumiStack,
                                    },
                                },
                                ["Effect"] = "Allow",
                                ["Resource"] = new[]
                                {
                                    langserveKeyArn,
                                },
                                ["Sid"] = "DecryptTaggedKMSKey",
                            },
                        },
                    });
                }),
            },
        },
        ManagedPolicyArns = new[]
        {
            "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
        },
    });

    var langserveTaskRole = new Aws.Iam.Role("langserve-task-role", new()
    {
        AssumeRolePolicy = JsonSerializer.Serialize(new Dictionary<string, object?>
        {
            ["Statement"] = new[]
            {
                new Dictionary<string, object?>
                {
                    ["Action"] = "sts:AssumeRole",
                    ["Effect"] = "Allow",
                    ["Principal"] = new Dictionary<string, object?>
                    {
                        ["Service"] = "ecs-tasks.amazonaws.com",
                    },
                },
            },
            ["Version"] = "2012-10-17",
        }),
        InlinePolicies = new[]
        {
            new Aws.Iam.Inputs.RoleInlinePolicyArgs
            {
                Name = "ExecuteCommand",
                Policy = JsonSerializer.Serialize(new Dictionary<string, object?>
                {
                    ["Version"] = "2012-10-17",
                    ["Statement"] = new[]
                    {
                        new Dictionary<string, object?>
                        {
                            ["Action"] = new[]
                            {
                                "ssmmessages:CreateControlChannel",
                                "ssmmessages:OpenControlChannel",
                                "ssmmessages:CreateDataChannel",
                                "ssmmessages:OpenDataChannel",
                            },
                            ["Effect"] = "Allow",
                            ["Resource"] = "*",
                        },
                        new Dictionary<string, object?>
                        {
                            ["Action"] = new[]
                            {
                                "logs:CreateLogStream",
                                "logs:DescribeLogGroups",
                                "logs:DescribeLogStreams",
                                "logs:PutLogEvents",
                            },
                            ["Effect"] = "Allow",
                            ["Resource"] = "*",
                        },
                    },
                }),
            },
            new Aws.Iam.Inputs.RoleInlinePolicyArgs
            {
                Name = "DenyIAM",
                Policy = JsonSerializer.Serialize(new Dictionary<string, object?>
                {
                    ["Version"] = "2012-10-17",
                    ["Statement"] = new[]
                    {
                        new Dictionary<string, object?>
                        {
                            ["Action"] = "iam:*",
                            ["Effect"] = "Deny",
                            ["Resource"] = "*",
                        },
                    },
                }),
            },
        },
    });

    var langserveTaskDefinition = new Aws.Ecs.TaskDefinition("langserve-task-definition", new()
    {
        Family = $"{pulumiProject}-{pulumiStack}",
        Cpu = "256",
        Memory = "512",
        NetworkMode = "awsvpc",
        ExecutionRoleArn = langserveExecutionRole.Arn,
        TaskRoleArn = langserveTaskRole.Arn,
        RequiresCompatibilities = new[]
        {
            "FARGATE",
        },
        ContainerDefinitions = Output.Tuple(langserveEcrImage.RepoDigest, langserveSsmParameter.Name, langserveLogGroup.Name).Apply(values =>
        {
            var repoDigest = values.Item1;
            var langserveSsmParameterName = values.Item2;
            var langserveLogGroupName = values.Item3;
            return JsonSerializer.Serialize(new[]
            {
                new Dictionary<string, object?>
                {
                    ["name"] = $"{pulumiProject}-{pulumiStack}-service",
                    ["image"] = repoDigest,
                    ["cpu"] = 0,
                    ["portMappings"] = new[]
                    {
                        new Dictionary<string, object?>
                        {
                            ["name"] = "target",
                            ["containerPort"] = 8080,
                            ["hostPort"] = 8080,
                            ["protocol"] = "tcp",
                        },
                    },
                    ["essential"] = true,
                    ["secrets"] = new[]
                    {
                        new Dictionary<string, object?>
                        {
                            ["name"] = "OPENAI_API_KEY",
                            ["valueFrom"] = langserveSsmParameterName,
                        },
                    },
                    ["logConfiguration"] = new Dictionary<string, object?>
                    {
                        ["logDriver"] = "awslogs",
                        ["options"] = new Dictionary<string, object?>
                        {
                            ["awslogs-group"] = langserveLogGroupName,
                            ["awslogs-region"] = "eu-central-1",
                            ["awslogs-stream-prefix"] = "pulumi-langserve",
                        },
                    },
                },
            });
        }),
    });

    var langserveEcsSecurityGroup = new Aws.Ec2.SecurityGroup("langserve-ecs-security-group", new()
    {
        VpcId = langserveVpc.Id,
        Ingress = new[]
        {
            new Aws.Ec2.Inputs.SecurityGroupIngressArgs
            {
                Protocol = "-1",
                FromPort = 0,
                ToPort = 0,
                CidrBlocks = new[]
                {
                    "0.0.0.0/0",
                },
            },
        },
        Egress = new[]
        {
            new Aws.Ec2.Inputs.SecurityGroupEgressArgs
            {
                Protocol = "-1",
                FromPort = 0,
                ToPort = 0,
                CidrBlocks = new[]
                {
                    "0.0.0.0/0",
                },
            },
        },
    });

    var langserveServiceDiscoveryNamespace = new Aws.ServiceDiscovery.PrivateDnsNamespace("langserve-service-discovery-namespace", new()
    {
        Name = $"{pulumiStack}.{pulumiProject}.local",
        Vpc = langserveVpc.Id,
    });

    var langserveService = new Aws.Ecs.Service("langserve-service", new()
    {
        Cluster = langserveEcsCluster.Arn,
        TaskDefinition = langserveTaskDefinition.Arn,
        DesiredCount = 1,
        LaunchType = "FARGATE",
        NetworkConfiguration = new Aws.Ecs.Inputs.ServiceNetworkConfigurationArgs
        {
            AssignPublicIp = true,
            SecurityGroups = new[]
            {
                langserveEcsSecurityGroup.Id,
            },
            Subnets = new[]
            {
                langserveSubnet1.Id,
                langserveSubnet2.Id,
            },
        },
        LoadBalancers = new[]
        {
            new Aws.Ecs.Inputs.ServiceLoadBalancerArgs
            {
                TargetGroupArn = langserveTargetGroup.Arn,
                ContainerName = $"{pulumiProject}-{pulumiStack}-service",
                ContainerPort = 8080,
            },
        },
        SchedulingStrategy = "REPLICA",
        ServiceConnectConfiguration = new Aws.Ecs.Inputs.ServiceServiceConnectConfigurationArgs
        {
            Enabled = true,
            Namespace = langserveServiceDiscoveryNamespace.Arn,
        },
        Tags = 
        {
            { "Name", $"{pulumiProject}-{pulumiStack}" },
        },
    });

    return new Dictionary<string, object?>
    {
        ["url"] = langserveLoadBalancer.DnsName.Apply(dnsName => $"http://{dnsName}"),
    };
});

