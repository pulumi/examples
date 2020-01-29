using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

using Pulumi;
using Docker = Pulumi.Docker;
using Ec2 = Pulumi.Aws.Ec2;
using Ecs = Pulumi.Aws.Ecs;
using Ecr = Pulumi.Aws.Ecr;
using Elb = Pulumi.Aws.ElasticLoadBalancingV2;
using Iam = Pulumi.Aws.Iam;

class Program
{
    static Task<int> Main()
    {
        return Deployment.RunAsync(async () =>
        {
            // Read back the default VPC and public subnets, which we will use.
            var vpc = await Ec2.Invokes.GetVpc(new Ec2.GetVpcArgs { Default = true });
            var subnet = await Ec2.Invokes.GetSubnetIds(new Ec2.GetSubnetIdsArgs { VpcId = vpc.Id });

            // Create a SecurityGroup that permits HTTP ingress and unrestricted egress.
            var webSg = new Ec2.SecurityGroup("web-sg", new Ec2.SecurityGroupArgs
            {
                VpcId = vpc.Id,
                Egress =
                {
                    new Ec2.Inputs.SecurityGroupEgressArgs
                    {
                        Protocol = "-1",
                        FromPort = 0,
                        ToPort = 0,
                        CidrBlocks = { "0.0.0.0/0" },
                    },
                },
                Ingress =
                {
                    new Ec2.Inputs.SecurityGroupIngressArgs
                    {
                        Protocol = "tcp",
                        FromPort = 80,
                        ToPort = 80,
                        CidrBlocks = { "0.0.0.0/0" },
                    },
                },
            });

            // Create an ECS cluster to run a container-based service.
            var cluster = new Ecs.Cluster("app-cluster");

            // Create an IAM role that can be used by our service's task.
            var taskExecRole = new Iam.Role("task-exec-role", new Iam.RoleArgs
            {
                AssumeRolePolicy = @"{
    ""Version"": ""2008-10-17"",
    ""Statement"": [{
        ""Sid"": """",
        ""Effect"": ""Allow"",
        ""Principal"": {
            ""Service"": ""ecs-tasks.amazonaws.com""
        },
        ""Action"": ""sts:AssumeRole""
    }]
}",
            });
            var taskExecAttach = new Iam.RolePolicyAttachment("task-exec-policy", new Iam.RolePolicyAttachmentArgs
            {
                Role = taskExecRole.Name,
                PolicyArn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
            });

            // Create a load balancer to listen for HTTP traffic on port 80.
            var webLb = new Elb.LoadBalancer("web-lb", new Elb.LoadBalancerArgs
            {
                Subnets = subnet.Ids,
                SecurityGroups = { webSg.Id },
            });
            var webTg = new Elb.TargetGroup("web-tg", new Elb.TargetGroupArgs
            {
                Port = 80,
                Protocol = "HTTP",
                TargetType = "ip",
                VpcId = vpc.Id,
            });
            var webListener = new Elb.Listener("web-listener", new Elb.ListenerArgs
            {
                LoadBalancerArn = webLb.Arn,
                Port = 80,
                DefaultActions =
                {
                    new Elb.Inputs.ListenerDefaultActionsArgs
                    {
                        Type = "forward",
                        TargetGroupArn = webTg.Arn,
                    },
                },
            });

            // Create a private ECR registry and build and publish our app's container image to it.
            var appRepo = new Ecr.Repository("app-repo");
            var appRepoCreds = appRepo.RegistryId.Apply(async rid =>
            {
                var creds = await Ecr.Invokes.GetCredentials(new Ecr.GetCredentialsArgs { RegistryId = rid });
                var credsData = Convert.FromBase64String(creds.AuthorizationToken);
                return Encoding.UTF8.GetString(credsData).Split(":");
            });
            var image = new Docker.Image("app-img", new Docker.ImageArgs
            {
                Build = "../App",
                ImageName = appRepo.RepositoryUrl,
                Registry = new Docker.ImageRegistry
                {
                    Server = appRepo.RepositoryUrl,
                    Username = appRepoCreds.Apply(creds => creds[0]),
                    Password = appRepoCreds.Apply(creds => creds[1]),
                },
            });

            // Spin up a load balanced service running our container image.
            var appTask = new Ecs.TaskDefinition("app-task", new Ecs.TaskDefinitionArgs
            {
                Family = "fargate-task-definition",
                Cpu = "256",
                Memory = "512",
                NetworkMode = "awsvpc",
                RequiresCompatibilities = { "FARGATE" },
                ExecutionRoleArn = taskExecRole.Arn,
                ContainerDefinitions = image.ImageName.Apply(imageName => @"[{
    ""name"": ""my-app"",
    ""image"": """ + imageName + @""",
    ""portMappings"": [{
        ""containerPort"": 80,
        ""hostPort"": 80,
        ""protocol"": ""tcp""
    }]
}]"),
            });
            var appSvc = new Ecs.Service("app-svc", new Ecs.ServiceArgs
            {
                Cluster = cluster.Arn,
                DesiredCount = 3,
                LaunchType = "FARGATE",
                TaskDefinition = appTask.Arn,
                NetworkConfiguration = new Ecs.Inputs.ServiceNetworkConfigurationArgs
                {
                    AssignPublicIp = true,
                    Subnets = subnet.Ids,
                    SecurityGroups = { webSg.Id },
                },
                LoadBalancers =
                {
                    new Ecs.Inputs.ServiceLoadBalancersArgs
                    {
                        TargetGroupArn = webTg.Arn,
                        ContainerName = "my-app",
                        ContainerPort = 80,
                    },
                },
            }, new CustomResourceOptions { DependsOn = { webListener } });

            // Export the resulting web address.
            return new Dictionary<string, object?>
            {
                { "url", Output.Format($"http://{webLb.DnsName}") },
            };
        });
    }
}
