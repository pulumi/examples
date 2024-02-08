package main

import (
	"encoding/json"
	"fmt"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/cloudwatch"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ecr"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ecs"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/iam"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/kms"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/lb"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/servicediscovery"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ssm"
	"github.com/pulumi/pulumi-docker/sdk/v4/go/docker"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi/config"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		cfg := config.New(ctx, "")
		vpcCidr := "10.0.0.0/16"
		if param := cfg.Get("vpc-cidr"); param != "" {
			vpcCidr = param
		}
		subnet1Cidr := "10.0.0.0/24"
		if param := cfg.Get("subnet-1-cidr"); param != "" {
			subnet1Cidr = param
		}
		subnet2Cidr := "10.0.1.0/24"
		if param := cfg.Get("subnet-2-cidr"); param != "" {
			subnet2Cidr = param
		}
		containerContext := "."
		if param := cfg.Get("container-context"); param != "" {
			containerContext = param
		}
		containerFile := "./Dockerfile"
		if param := cfg.Get("container-file"); param != "" {
			containerFile = param
		}
		openApiKey := "CHANGEME"
		if param := cfg.Get("open-api-key"); param != "" {
			openApiKey = param
		}
		availabilityZones := []string{
			"eu-central-1a",
			"eu-central-1b",
		}
		current, err := aws.GetCallerIdentity(ctx, nil, nil)
		if err != nil {
			return err
		}
		pulumiProject := ctx.Project()
		pulumiStack := ctx.Stack()
		langserveEcrRepository, err := ecr.NewRepository(ctx, "langserve-ecr-repository", &ecr.RepositoryArgs{
			Name:        pulumi.String(fmt.Sprintf("%v-%v", pulumiProject, pulumiStack)),
			ForceDelete: pulumi.Bool(true),
		})
		if err != nil {
			return err
		}
		token := ecr.GetAuthorizationTokenOutput(ctx, ecr.GetAuthorizationTokenOutputArgs{
			RegistryId: langserveEcrRepository.RegistryId,
		}, nil)
		accountId := current.AccountId
		tmpJSON0, err := json.Marshal(map[string]interface{}{
			"rules": []map[string]interface{}{
				map[string]interface{}{
					"rulePriority": 1,
					"description":  "Expire images when they are more than 10 available",
					"selection": map[string]interface{}{
						"tagStatus":   "any",
						"countType":   "imageCountMoreThan",
						"countNumber": 10,
					},
					"action": map[string]interface{}{
						"type": "expire",
					},
				},
			},
		})
		if err != nil {
			return err
		}
		json0 := string(tmpJSON0)
		_, err = ecr.NewLifecyclePolicy(ctx, "langserve-ecr-life-cycle-policy", &ecr.LifecyclePolicyArgs{
			Repository: langserveEcrRepository.Name,
			Policy:     pulumi.String(json0),
		})
		if err != nil {
			return err
		}
		langserveEcrImage, err := docker.NewImage(ctx, "langserve-ecr-image", &docker.ImageArgs{
			Build: &docker.DockerBuildArgs{
				Platform:   pulumi.String("linux/amd64"),
				Context:    pulumi.String(containerContext),
				Dockerfile: pulumi.String(containerFile),
			},
			ImageName: langserveEcrRepository.RepositoryUrl,
			Registry: &docker.RegistryArgs{
				Server: langserveEcrRepository.RepositoryUrl,
				Username: token.ApplyT(func(token ecr.GetAuthorizationTokenResult) (*string, error) {
					return &token.UserName, nil
				}).(pulumi.StringPtrOutput),
				Password: pulumi.ToSecret(token.ApplyT(func(token ecr.GetAuthorizationTokenResult) (*string, error) {
					return &token.Password, nil
				}).(pulumi.StringPtrOutput)).(*pulumi.StringOutput),
			},
		})
		if err != nil {
			return err
		}
		langserveVpc, err := ec2.NewVpc(ctx, "langserve-vpc", &ec2.VpcArgs{
			CidrBlock:          pulumi.String(vpcCidr),
			EnableDnsHostnames: pulumi.Bool(true),
			EnableDnsSupport:   pulumi.Bool(true),
			InstanceTenancy:    pulumi.String("default"),
			Tags: pulumi.StringMap{
				"Name": pulumi.String(fmt.Sprintf("%v-%v", pulumiProject, pulumiStack)),
			},
		})
		if err != nil {
			return err
		}
		langserveRt, err := ec2.NewRouteTable(ctx, "langserve-rt", &ec2.RouteTableArgs{
			VpcId: langserveVpc.ID(),
			Tags: pulumi.StringMap{
				"Name": pulumi.String(fmt.Sprintf("%v-%v", pulumiProject, pulumiStack)),
			},
		})
		if err != nil {
			return err
		}
		langserveIgw, err := ec2.NewInternetGateway(ctx, "langserve-igw", &ec2.InternetGatewayArgs{
			VpcId: langserveVpc.ID(),
			Tags: pulumi.StringMap{
				"Name": pulumi.String(fmt.Sprintf("%v-%v", pulumiProject, pulumiStack)),
			},
		})
		if err != nil {
			return err
		}
		_, err = ec2.NewRoute(ctx, "langserve-route", &ec2.RouteArgs{
			RouteTableId:         langserveRt.ID(),
			DestinationCidrBlock: pulumi.String("0.0.0.0/0"),
			GatewayId:            langserveIgw.ID(),
		})
		if err != nil {
			return err
		}
		langserveSubnet1, err := ec2.NewSubnet(ctx, "langserve-subnet1", &ec2.SubnetArgs{
			VpcId:               langserveVpc.ID(),
			CidrBlock:           pulumi.String(subnet1Cidr),
			AvailabilityZone:    pulumi.String(availabilityZones[0]),
			MapPublicIpOnLaunch: pulumi.Bool(true),
			Tags: pulumi.StringMap{
				"Name": pulumi.String(fmt.Sprintf("%v-%v-1", pulumiProject, pulumiStack)),
			},
		})
		if err != nil {
			return err
		}
		langserveSubnet2, err := ec2.NewSubnet(ctx, "langserve-subnet2", &ec2.SubnetArgs{
			VpcId:               langserveVpc.ID(),
			CidrBlock:           pulumi.String(subnet2Cidr),
			AvailabilityZone:    pulumi.String(availabilityZones[1]),
			MapPublicIpOnLaunch: pulumi.Bool(true),
			Tags: pulumi.StringMap{
				"Name": pulumi.String(fmt.Sprintf("%v-%v-2", pulumiProject, pulumiStack)),
			},
		})
		if err != nil {
			return err
		}
		_, err = ec2.NewRouteTableAssociation(ctx, "langserve-subnet1-rt-assoc", &ec2.RouteTableAssociationArgs{
			SubnetId:     langserveSubnet1.ID(),
			RouteTableId: langserveRt.ID(),
		})
		if err != nil {
			return err
		}
		_, err = ec2.NewRouteTableAssociation(ctx, "langserve-subnet2-rt-assoc", &ec2.RouteTableAssociationArgs{
			SubnetId:     langserveSubnet2.ID(),
			RouteTableId: langserveRt.ID(),
		})
		if err != nil {
			return err
		}
		langserveEcsCluster, err := ecs.NewCluster(ctx, "langserve-ecs-cluster", &ecs.ClusterArgs{
			Configuration: &ecs.ClusterConfigurationArgs{
				ExecuteCommandConfiguration: &ecs.ClusterConfigurationExecuteCommandConfigurationArgs{
					Logging: pulumi.String("DEFAULT"),
				},
			},
			Settings: ecs.ClusterSettingArray{
				&ecs.ClusterSettingArgs{
					Name:  pulumi.String("containerInsights"),
					Value: pulumi.String("disabled"),
				},
			},
			Tags: pulumi.StringMap{
				"Name": pulumi.String(fmt.Sprintf("%v-%v", pulumiProject, pulumiStack)),
			},
		})
		if err != nil {
			return err
		}
		_, err = ecs.NewClusterCapacityProviders(ctx, "langserve-cluster-capacity-providers", &ecs.ClusterCapacityProvidersArgs{
			ClusterName: langserveEcsCluster.Name,
			CapacityProviders: pulumi.StringArray{
				pulumi.String("FARGATE"),
				pulumi.String("FARGATE_SPOT"),
			},
		})
		if err != nil {
			return err
		}
		langserveSecurityGroup, err := ec2.NewSecurityGroup(ctx, "langserve-security-group", &ec2.SecurityGroupArgs{
			VpcId: langserveVpc.ID(),
			Ingress: ec2.SecurityGroupIngressArray{
				&ec2.SecurityGroupIngressArgs{
					Protocol: pulumi.String("tcp"),
					FromPort: pulumi.Int(80),
					ToPort:   pulumi.Int(80),
					CidrBlocks: pulumi.StringArray{
						pulumi.String("0.0.0.0/0"),
					},
				},
			},
			Egress: ec2.SecurityGroupEgressArray{
				&ec2.SecurityGroupEgressArgs{
					Protocol: pulumi.String("-1"),
					FromPort: pulumi.Int(0),
					ToPort:   pulumi.Int(0),
					CidrBlocks: pulumi.StringArray{
						pulumi.String("0.0.0.0/0"),
					},
				},
			},
		})
		if err != nil {
			return err
		}
		langserveLoadBalancer, err := lb.NewLoadBalancer(ctx, "langserve-load-balancer", &lb.LoadBalancerArgs{
			LoadBalancerType: pulumi.String("application"),
			SecurityGroups: pulumi.StringArray{
				langserveSecurityGroup.ID(),
			},
			Subnets: pulumi.StringArray{
				langserveSubnet1.ID(),
				langserveSubnet2.ID(),
			},
		})
		if err != nil {
			return err
		}
		langserveTargetGroup, err := lb.NewTargetGroup(ctx, "langserve-target-group", &lb.TargetGroupArgs{
			Port:       pulumi.Int(80),
			Protocol:   pulumi.String("HTTP"),
			TargetType: pulumi.String("ip"),
			VpcId:      langserveVpc.ID(),
		})
		if err != nil {
			return err
		}
		_, err = lb.NewListener(ctx, "langserve-listener", &lb.ListenerArgs{
			LoadBalancerArn: langserveLoadBalancer.Arn,
			Port:            pulumi.Int(80),
			Protocol:        pulumi.String("HTTP"),
			DefaultActions: lb.ListenerDefaultActionArray{
				&lb.ListenerDefaultActionArgs{
					Type:           pulumi.String("forward"),
					TargetGroupArn: langserveTargetGroup.Arn,
				},
			},
		})
		if err != nil {
			return err
		}
		langserveLogGroup, err := cloudwatch.NewLogGroup(ctx, "langserve-log-group", &cloudwatch.LogGroupArgs{
			RetentionInDays: pulumi.Int(7),
		})
		if err != nil {
			return err
		}
		tmpJSON1, err := json.Marshal(map[string]interface{}{
			"Version": "2012-10-17",
			"Statement": []interface{}{
				map[string]interface{}{
					"Effect": "Allow",
					"Principal": map[string]interface{}{
						"AWS": fmt.Sprintf("arn:aws:iam::%v:root", accountId),
					},
					"Action": []string{
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
					"Resource": "*",
				},
				map[string]interface{}{
					"Effect": "Allow",
					"Principal": map[string]interface{}{
						"AWS": fmt.Sprintf("arn:aws:iam::%v:root", accountId),
					},
					"Action": []string{
						"kms:Encrypt",
						"kms:Decrypt",
						"kms:ReEncrypt*",
						"kms:GenerateDataKey*",
						"kms:DescribeKey",
					},
					"Resource": "*",
				},
			},
		})
		if err != nil {
			return err
		}
		json1 := string(tmpJSON1)
		langserveKey, err := kms.NewKey(ctx, "langserve-key", &kms.KeyArgs{
			Description:       pulumi.String("Key for encrypting secrets"),
			EnableKeyRotation: pulumi.Bool(true),
			Policy:            pulumi.String(json1),
			Tags: pulumi.StringMap{
				"pulumi-application": pulumi.String(pulumiProject),
				"pulumi-environment": pulumi.String(pulumiStack),
			},
		})
		if err != nil {
			return err
		}
		langserveSsmParameter, err := ssm.NewParameter(ctx, "langserve-ssm-parameter", &ssm.ParameterArgs{
			Type:  pulumi.String("SecureString"),
			Value: pulumi.String(openApiKey),
			KeyId: langserveKey.KeyId,
			Name:  pulumi.String(fmt.Sprintf("/pulumi/%v/%v/OPENAI_API_KEY", pulumiProject, pulumiStack)),
			Tags: pulumi.StringMap{
				"pulumi-application": pulumi.String(pulumiProject),
				"pulumi-environment": pulumi.String(pulumiStack),
			},
		})
		if err != nil {
			return err
		}
		tmpJSON2, err := json.Marshal(map[string]interface{}{
			"Statement": []map[string]interface{}{
				map[string]interface{}{
					"Action": "sts:AssumeRole",
					"Effect": "Allow",
					"Principal": map[string]interface{}{
						"Service": "ecs-tasks.amazonaws.com",
					},
				},
			},
			"Version": "2012-10-17",
		})
		if err != nil {
			return err
		}
		json2 := string(tmpJSON2)
		langserveExecutionRole, err := iam.NewRole(ctx, "langserve-execution-role", &iam.RoleArgs{
			AssumeRolePolicy: pulumi.String(json2),
			InlinePolicies: iam.RoleInlinePolicyArray{
				&iam.RoleInlinePolicyArgs{
					Name: pulumi.String(fmt.Sprintf("%v-%v-service-secrets-policy", pulumiProject, pulumiStack)),
					Policy: pulumi.All(langserveSsmParameter.Arn, langserveKey.Arn).ApplyT(func(_args []interface{}) (string, error) {
						langserveSsmParameterArn := _args[0].(string)
						langserveKeyArn := _args[1].(string)
						var _zero string
						tmpJSON3, err := json.Marshal(map[string]interface{}{
							"Version": "2012-10-17",
							"Statement": []interface{}{
								map[string]interface{}{
									"Action": []string{
										"ssm:GetParameters",
									},
									"Condition": map[string]interface{}{
										"StringEquals": map[string]interface{}{
											"ssm:ResourceTag/pulumi-application": pulumiProject,
											"ssm:ResourceTag/pulumi-environment": pulumiStack,
										},
									},
									"Effect": "Allow",
									"Resource": []string{
										langserveSsmParameterArn,
									},
								},
								map[string]interface{}{
									"Action": []string{
										"kms:Decrypt",
									},
									"Condition": map[string]interface{}{
										"StringEquals": map[string]interface{}{
											"aws:ResourceTag/pulumi-application": pulumiProject,
											"aws:ResourceTag/pulumi-environment": pulumiStack,
										},
									},
									"Effect": "Allow",
									"Resource": []string{
										langserveKeyArn,
									},
									"Sid": "DecryptTaggedKMSKey",
								},
							},
						})
						if err != nil {
							return _zero, err
						}
						json3 := string(tmpJSON3)
						return json3, nil
					}).(pulumi.StringOutput),
				},
			},
			ManagedPolicyArns: pulumi.StringArray{
				pulumi.String("arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"),
			},
		})
		if err != nil {
			return err
		}
		tmpJSON4, err := json.Marshal(map[string]interface{}{
			"Statement": []map[string]interface{}{
				map[string]interface{}{
					"Action": "sts:AssumeRole",
					"Effect": "Allow",
					"Principal": map[string]interface{}{
						"Service": "ecs-tasks.amazonaws.com",
					},
				},
			},
			"Version": "2012-10-17",
		})
		if err != nil {
			return err
		}
		json4 := string(tmpJSON4)
		tmpJSON5, err := json.Marshal(map[string]interface{}{
			"Version": "2012-10-17",
			"Statement": []map[string]interface{}{
				map[string]interface{}{
					"Action": []string{
						"ssmmessages:CreateControlChannel",
						"ssmmessages:OpenControlChannel",
						"ssmmessages:CreateDataChannel",
						"ssmmessages:OpenDataChannel",
					},
					"Effect":   "Allow",
					"Resource": "*",
				},
				map[string]interface{}{
					"Action": []string{
						"logs:CreateLogStream",
						"logs:DescribeLogGroups",
						"logs:DescribeLogStreams",
						"logs:PutLogEvents",
					},
					"Effect":   "Allow",
					"Resource": "*",
				},
			},
		})
		if err != nil {
			return err
		}
		json5 := string(tmpJSON5)
		tmpJSON6, err := json.Marshal(map[string]interface{}{
			"Version": "2012-10-17",
			"Statement": []map[string]interface{}{
				map[string]interface{}{
					"Action":   "iam:*",
					"Effect":   "Deny",
					"Resource": "*",
				},
			},
		})
		if err != nil {
			return err
		}
		json6 := string(tmpJSON6)
		langserveTaskRole, err := iam.NewRole(ctx, "langserve-task-role", &iam.RoleArgs{
			AssumeRolePolicy: pulumi.String(json4),
			InlinePolicies: iam.RoleInlinePolicyArray{
				&iam.RoleInlinePolicyArgs{
					Name:   pulumi.String("ExecuteCommand"),
					Policy: pulumi.String(json5),
				},
				&iam.RoleInlinePolicyArgs{
					Name:   pulumi.String("DenyIAM"),
					Policy: pulumi.String(json6),
				},
			},
		})
		if err != nil {
			return err
		}
		langserveTaskDefinition, err := ecs.NewTaskDefinition(ctx, "langserve-task-definition", &ecs.TaskDefinitionArgs{
			Family:           pulumi.String(fmt.Sprintf("%v-%v", pulumiProject, pulumiStack)),
			Cpu:              pulumi.String("256"),
			Memory:           pulumi.String("512"),
			NetworkMode:      pulumi.String("awsvpc"),
			ExecutionRoleArn: langserveExecutionRole.Arn,
			TaskRoleArn:      langserveTaskRole.Arn,
			RequiresCompatibilities: pulumi.StringArray{
				pulumi.String("FARGATE"),
			},
			ContainerDefinitions: pulumi.All(langserveEcrImage.RepoDigest, langserveSsmParameter.Name, langserveLogGroup.Name).ApplyT(func(_args []interface{}) (string, error) {
				repoDigest := _args[0].(string)
				langserveSsmParameterName := _args[1].(string)
				langserveLogGroupName := _args[2].(string)
				var _zero string
				tmpJSON7, err := json.Marshal([]map[string]interface{}{
					map[string]interface{}{
						"name":  fmt.Sprintf("%v-%v-service", pulumiProject, pulumiStack),
						"image": repoDigest,
						"cpu":   0,
						"portMappings": []map[string]interface{}{
							map[string]interface{}{
								"name":          "target",
								"containerPort": 8080,
								"hostPort":      8080,
								"protocol":      "tcp",
							},
						},
						"essential": true,
						"secrets": []map[string]interface{}{
							map[string]interface{}{
								"name":      "OPENAI_API_KEY",
								"valueFrom": langserveSsmParameterName,
							},
						},
						"logConfiguration": map[string]interface{}{
							"logDriver": "awslogs",
							"options": map[string]interface{}{
								"awslogs-group":         langserveLogGroupName,
								"awslogs-region":        "eu-central-1",
								"awslogs-stream-prefix": "pulumi-langserve",
							},
						},
					},
				})
				if err != nil {
					return _zero, err
				}
				json7 := string(tmpJSON7)
				return json7, nil
			}).(pulumi.StringOutput),
		})
		if err != nil {
			return err
		}
		langserveEcsSecurityGroup, err := ec2.NewSecurityGroup(ctx, "langserve-ecs-security-group", &ec2.SecurityGroupArgs{
			VpcId: langserveVpc.ID(),
			Ingress: ec2.SecurityGroupIngressArray{
				&ec2.SecurityGroupIngressArgs{
					Protocol: pulumi.String("-1"),
					FromPort: pulumi.Int(0),
					ToPort:   pulumi.Int(0),
					CidrBlocks: pulumi.StringArray{
						pulumi.String("0.0.0.0/0"),
					},
				},
			},
			Egress: ec2.SecurityGroupEgressArray{
				&ec2.SecurityGroupEgressArgs{
					Protocol: pulumi.String("-1"),
					FromPort: pulumi.Int(0),
					ToPort:   pulumi.Int(0),
					CidrBlocks: pulumi.StringArray{
						pulumi.String("0.0.0.0/0"),
					},
				},
			},
		})
		if err != nil {
			return err
		}
		langserveServiceDiscoveryNamespace, err := servicediscovery.NewPrivateDnsNamespace(ctx, "langserve-service-discovery-namespace", &servicediscovery.PrivateDnsNamespaceArgs{
			Name: pulumi.String(fmt.Sprintf("%v.%v.local", pulumiStack, pulumiProject)),
			Vpc:  langserveVpc.ID(),
		})
		if err != nil {
			return err
		}
		_, err = ecs.NewService(ctx, "langserve-service", &ecs.ServiceArgs{
			Cluster:        langserveEcsCluster.Arn,
			TaskDefinition: langserveTaskDefinition.Arn,
			DesiredCount:   pulumi.Int(1),
			LaunchType:     pulumi.String("FARGATE"),
			NetworkConfiguration: &ecs.ServiceNetworkConfigurationArgs{
				AssignPublicIp: pulumi.Bool(true),
				SecurityGroups: pulumi.StringArray{
					langserveEcsSecurityGroup.ID(),
				},
				Subnets: pulumi.StringArray{
					langserveSubnet1.ID(),
					langserveSubnet2.ID(),
				},
			},
			LoadBalancers: ecs.ServiceLoadBalancerArray{
				&ecs.ServiceLoadBalancerArgs{
					TargetGroupArn: langserveTargetGroup.Arn,
					ContainerName:  pulumi.String(fmt.Sprintf("%v-%v-service", pulumiProject, pulumiStack)),
					ContainerPort:  pulumi.Int(8080),
				},
			},
			SchedulingStrategy: pulumi.String("REPLICA"),
			ServiceConnectConfiguration: &ecs.ServiceServiceConnectConfigurationArgs{
				Enabled:   pulumi.Bool(true),
				Namespace: langserveServiceDiscoveryNamespace.Arn,
			},
			Tags: pulumi.StringMap{
				"Name": pulumi.String(fmt.Sprintf("%v-%v", pulumiProject, pulumiStack)),
			},
		})
		if err != nil {
			return err
		}
		ctx.Export("url", langserveLoadBalancer.DnsName.ApplyT(func(dnsName string) (string, error) {
			return fmt.Sprintf("http://%v", dnsName), nil
		}).(pulumi.StringOutput))
		return nil
	})
}
