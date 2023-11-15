package main

import (
	"encoding/base64"
	"fmt"
	"strings"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ecr"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ecs"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/iam"
	elb "github.com/pulumi/pulumi-aws/sdk/v6/go/aws/lb"
	awsx "github.com/pulumi/pulumi-awsx/sdk/v2/go/awsx/ec2"
	"github.com/pulumi/pulumi-docker/sdk/v4/go/docker"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Create a new VPC and subnets using AWS Crosswalk
		vpcCidrBlock := "10.0.0.0/16"
		vpc, err := awsx.NewVpc(ctx, "vpc", &awsx.VpcArgs{
			EnableDnsHostnames: pulumi.Bool(true),
			CidrBlock:          &vpcCidrBlock,
		})
		if err != nil {
			return err
		}

		// Create a SecurityGroup that permits HTTP ingress and unrestricted egress.
		webSg, err := ec2.NewSecurityGroup(ctx, "web-sg", &ec2.SecurityGroupArgs{
			VpcId: vpc.VpcId,
			Egress: ec2.SecurityGroupEgressArray{
				ec2.SecurityGroupEgressArgs{
					Protocol:   pulumi.String("-1"),
					FromPort:   pulumi.Int(0),
					ToPort:     pulumi.Int(0),
					CidrBlocks: pulumi.StringArray{pulumi.String("0.0.0.0/0")},
				},
			},
			Ingress: ec2.SecurityGroupIngressArray{
				ec2.SecurityGroupIngressArgs{
					Protocol:   pulumi.String("tcp"),
					FromPort:   pulumi.Int(80),
					ToPort:     pulumi.Int(80),
					CidrBlocks: pulumi.StringArray{pulumi.String("0.0.0.0/0")},
				},
			},
		})
		if err != nil {
			return err
		}

		// Create an ECS cluster to run a container-based service.
		cluster, err := ecs.NewCluster(ctx, "app-cluster", nil)
		if err != nil {
			return err
		}

		// Create an IAM role that can be used by our service's task.
		taskExecRole, err := iam.NewRole(ctx, "task-exec-role", &iam.RoleArgs{
			AssumeRolePolicy: pulumi.String(`{
    "Version": "2008-10-17",
    "Statement": [{
        "Sid": "",
        "Effect": "Allow",
        "Principal": {
            "Service": "ecs-tasks.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
    }]
}`),
		})
		if err != nil {
			return err
		}
		_, err = iam.NewRolePolicyAttachment(ctx, "task-exec-policy", &iam.RolePolicyAttachmentArgs{
			Role:      taskExecRole.Name,
			PolicyArn: pulumi.String("arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"),
		})
		if err != nil {
			return err
		}

		// Create a load balancer to listen for HTTP traffic on port 80.
		webLb, err := elb.NewLoadBalancer(ctx, "web-lb", &elb.LoadBalancerArgs{
			// Subnets:        toPulumiStringArray(subnet.Ids),
			Subnets:        vpc.PublicSubnetIds,
			SecurityGroups: pulumi.StringArray{webSg.ID().ToStringOutput()},
		})
		if err != nil {
			return err
		}
		webTg, err := elb.NewTargetGroup(ctx, "web-tg", &elb.TargetGroupArgs{
			Port:       pulumi.Int(80),
			Protocol:   pulumi.String("HTTP"),
			TargetType: pulumi.String("ip"),
			VpcId:      vpc.VpcId,
		})
		if err != nil {
			return err
		}
		webListener, err := elb.NewListener(ctx, "web-listener", &elb.ListenerArgs{
			LoadBalancerArn: webLb.Arn,
			Port:            pulumi.Int(80),
			DefaultActions: elb.ListenerDefaultActionArray{
				elb.ListenerDefaultActionArgs{
					Type:           pulumi.String("forward"),
					TargetGroupArn: webTg.Arn,
				},
			},
		})
		if err != nil {
			return err
		}

		// Create an ECR repository to store the container image
		repo, err := ecr.NewRepository(ctx, "foo", &ecr.RepositoryArgs{
			ForceDelete: pulumi.Bool(true),
		})
		if err != nil {
			return err
		}

		// Get credentials for the new ECR repository
		repoCreds := repo.RegistryId.ApplyT(func(rid string) ([]string, error) {
			creds, err := ecr.GetCredentials(ctx, &ecr.GetCredentialsArgs{
				RegistryId: rid,
			})
			if err != nil {
				return nil, err
			}
			data, err := base64.StdEncoding.DecodeString(creds.AuthorizationToken)
			if err != nil {
				fmt.Println("error:", err)
				return nil, err
			}

			return strings.Split(string(data), ":"), nil
		}).(pulumi.StringArrayOutput)
		repoUser := repoCreds.Index(pulumi.Int(0))
		repoPass := repoCreds.Index(pulumi.Int(1))

		// Build the container image (requires local Docker daemon)
		image, err := docker.NewImage(ctx, "my-image", &docker.ImageArgs{
			Build: docker.DockerBuildArgs{
				Context:  pulumi.String("./app"),
				Platform: pulumi.String("linux/amd64"),
			},
			ImageName: repo.RepositoryUrl,
			Registry: docker.RegistryArgs{
				Server:   repo.RepositoryUrl,
				Username: repoUser,
				Password: repoPass,
			},
		})
		if err != nil {
			return err
		}

		// Create the container definition
		containerDef := image.ImageName.ApplyT(func(name string) (string, error) {
			fmtstr := `[{
				"name": "my-app",
				"image": %q,
				"portMappings": [{
					"containerPort": 80,
					"hostPort": 80,
					"protocol": "tcp"
				}]
			}]`
			return fmt.Sprintf(fmtstr, name), nil
		}).(pulumi.StringOutput)

		// Spin up a load balanced service running the container image created earlier
		appTask, err := ecs.NewTaskDefinition(ctx, "app-task", &ecs.TaskDefinitionArgs{
			Family:                  pulumi.String("fargate-task-definition"),
			Cpu:                     pulumi.String("256"),
			Memory:                  pulumi.String("512"),
			NetworkMode:             pulumi.String("awsvpc"),
			RequiresCompatibilities: pulumi.StringArray{pulumi.String("FARGATE")},
			ExecutionRoleArn:        taskExecRole.Arn,
			ContainerDefinitions:    containerDef,
		})
		if err != nil {
			return err
		}
		_, err = ecs.NewService(ctx, "app-svc", &ecs.ServiceArgs{
			Cluster:        cluster.Arn,
			DesiredCount:   pulumi.Int(5),
			LaunchType:     pulumi.String("FARGATE"),
			TaskDefinition: appTask.Arn,
			NetworkConfiguration: &ecs.ServiceNetworkConfigurationArgs{
				AssignPublicIp: pulumi.Bool(true),
				Subnets:        vpc.PublicSubnetIds,
				SecurityGroups: pulumi.StringArray{webSg.ID().ToStringOutput()},
			},
			LoadBalancers: ecs.ServiceLoadBalancerArray{
				ecs.ServiceLoadBalancerArgs{
					TargetGroupArn: webTg.Arn,
					ContainerName:  pulumi.String("my-app"),
					ContainerPort:  pulumi.Int(80),
				},
			},
		}, pulumi.DependsOn([]pulumi.Resource{webListener}))
		if err != nil {
			return err
		}

		// Export the resulting web address.
		ctx.Export("url", webLb.DnsName)
		return nil
	})
}
