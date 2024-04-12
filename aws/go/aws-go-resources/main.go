package main

import (
	"encoding/json"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/cloudwatch"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/dynamodb"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ecr"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ecs"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/iam"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/kinesis"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/sns"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/sqs"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {

		// -- CloudWatch --
		loginTopic, err := sns.NewTopic(ctx, "myloginstopic", &sns.TopicArgs{})
		if err != nil {
			return err
		}

		// Event Rule
		eventPatternJSON, err := json.Marshal(map[string]interface{}{
			"detail-type": []string{
				"AWS Console Sign In via CloudTrail",
			},
		},
		)
		if err != nil {
			return err
		}
		eventRule, err := cloudwatch.NewEventRule(ctx, "myeventrule", &cloudwatch.EventRuleArgs{
			EventPattern: pulumi.String(eventPatternJSON),
		})
		if err != nil {
			return err
		}

		// Event Target
		_, err = cloudwatch.NewEventTarget(ctx, "myeventtarget", &cloudwatch.EventTargetArgs{
			Rule:     eventRule.Name,
			TargetId: pulumi.String("SendToSNS"),
			Arn:      loginTopic.Arn,
		})

		// Log Group
		logGroup, err := cloudwatch.NewLogGroup(ctx, "myloggroup", &cloudwatch.LogGroupArgs{})
		if err != nil {
			return err
		}

		// Log Metric Filter
		_, err = cloudwatch.NewLogMetricFilter(ctx, "mylogmetricfilter", &cloudwatch.LogMetricFilterArgs{
			Pattern:      pulumi.String(""),
			LogGroupName: logGroup.Name,
			MetricTransformation: cloudwatch.LogMetricFilterMetricTransformationArgs{
				Name:      pulumi.String("EventCount"),
				Namespace: pulumi.String("YourNamespace"),
				Value:     pulumi.String("1"),
			},
		})
		if err != nil {
			return err
		}

		// Log Stream
		_, err = cloudwatch.NewLogStream(ctx, "mylogstream", &cloudwatch.LogStreamArgs{
			LogGroupName: logGroup.Name,
		})
		if err != nil {
			return err
		}

		// Metric Alarm
		_, err = cloudwatch.NewMetricAlarm(ctx, "mymetricalarm", &cloudwatch.MetricAlarmArgs{
			ComparisonOperator: pulumi.String("GreaterThanOrEqualToThreshold"),
			EvaluationPeriods:  pulumi.Int(2),
			MetricName:         pulumi.String("CPUUtilization"),
			Namespace:          pulumi.String("AWS/EC2"),
			Period:             pulumi.Int(120),
			Statistic:          pulumi.String("Average"),
			Threshold:          pulumi.Float64Ptr(80),
			AlarmDescription:   pulumi.String("This metric monitors ec2 cpu utilization"),
		})

		// DynamoDB
		_, err = dynamodb.NewTable(ctx, "mytable", &dynamodb.TableArgs{
			Attributes: dynamodb.TableAttributeArray{
				&dynamodb.TableAttributeArgs{
					Name: pulumi.String("Id"),
					Type: pulumi.String("S"),
				},
			},
			HashKey:       pulumi.String("Id"),
			ReadCapacity:  pulumi.Int(1),
			WriteCapacity: pulumi.Int(1),
		})
		if err != nil {
			return err
		}

		// -- EC2 --
		// eip
		_, err = ec2.NewEip(ctx, "myeip", &ec2.EipArgs{})
		if err != nil {
			return err
		}

		// Security Group
		_, err = ec2.NewSecurityGroup(ctx, "mysecuritygroup", &ec2.SecurityGroupArgs{
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

		// VPC
		vpc, err := ec2.NewVpc(ctx, "myvpc", &ec2.VpcArgs{
			CidrBlock: pulumi.String("10.0.0.0/16"),
		})
		if err != nil {
			return err
		}

		// Internet Gateway
		igw, err := ec2.NewInternetGateway(ctx, "myinternetgateway", &ec2.InternetGatewayArgs{
			VpcId: vpc.ID(),
		})
		if err != nil {
			return err
		}

		// Route Table
		_, err = ec2.NewRouteTable(ctx, "myroutetable", &ec2.RouteTableArgs{
			Routes: ec2.RouteTableRouteArray{
				ec2.RouteTableRouteArgs{
					CidrBlock: pulumi.String("0.0.0.0/0"),
					GatewayId: igw.ID(),
				},
			},
			VpcId: vpc.ID(),
		})
		if err != nil {
			return err
		}

		// -- ECR --
		repository, err := ecr.NewRepository(ctx, "myrepository", &ecr.RepositoryArgs{})
		if err != nil {
			return err
		}

		// Repository Policy
		repoPolicyJSON, err := json.Marshal(map[string]interface{}{
			"Version": "2012-10-17",
			"Statement": []interface{}{
				map[string]interface{}{
					"Sid":       "new policy",
					"Effect":    "Allow",
					"Principal": "*",
					"Action": []string{
						"ecr:GetDownloadUrlForLayer",
						"ecr:BatchGetImage",
						"ecr:BatchCheckLayerAvailability",
						"ecr:PutImage",
						"ecr:InitiateLayerUpload",
						"ecr:UploadLayerPart",
						"ecr:CompleteLayerUpload",
						"ecr:DescribeRepositories",
						"ecr:GetRepositoryPolicy",
						"ecr:ListImages",
						"ecr:DeleteRepository",
						"ecr:BatchDeleteImage",
						"ecr:SetRepositoryPolicy",
						"ecr:DeleteRepositoryPolicy",
					},
				},
			},
		})
		if err != nil {
			return err
		}
		_, err = ecr.NewRepositoryPolicy(ctx, "myrepositorypolicy", &ecr.RepositoryPolicyArgs{
			Repository: repository.ID(),
			Policy:     pulumi.String(repoPolicyJSON),
		})
		if err != nil {
			return err
		}

		// Lifecycle Policy
		lcyclePolicy, err := json.Marshal(map[string]interface{}{
			"rules": []interface{}{
				map[string]interface{}{
					"rulePriority": 1,
					"description":  "Expire images older than 14 days",
					"selection": map[string]interface{}{
						"tagStatus":   "untagged",
						"countType":   "sinceImagePushed",
						"countUnit":   "days",
						"countNumber": 14,
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
		_, err = ecr.NewLifecyclePolicy(ctx, "mylifecyclepolicy", &ecr.LifecyclePolicyArgs{
			Repository: repository.ID(),
			Policy:     pulumi.String(lcyclePolicy),
		})
		if err != nil {
			return err
		}

		// -- ECS --
		_, err = ecs.NewCluster(ctx, "mycluster", &ecs.ClusterArgs{})
		if err != nil {
			return err
		}

		// Role
		roleJSON, err := json.Marshal(map[string]interface{}{
			"Version": "2012-10-17",
			"Statement": []interface{}{
				map[string]interface{}{
					"Action": "sts:AssumeRole",
					"Principal": map[string]interface{}{
						"Service": "ec2.amazonaws.com",
					},
					"Effect": "Allow",
					"Sid":    "",
				},
			},
		})
		if err != nil {
			return err
		}
		role, err := iam.NewRole(ctx, "myrole", &iam.RoleArgs{
			AssumeRolePolicy: pulumi.String(roleJSON),
		})
		if err != nil {
			return err
		}

		// Role Policy
		rolepolicyJSON, err := json.Marshal(map[string]interface{}{
			"Version": "2012-10-17",
			"Statement": []interface{}{
				map[string]interface{}{
					"Action":   []string{"ec2:Describe*"},
					"Effect":   "Allow",
					"Resource": "*",
				},
			},
		})
		_, err = iam.NewRolePolicy(ctx, "myrolepolicy", &iam.RolePolicyArgs{
			Role:   role.ID(),
			Policy: pulumi.String(rolepolicyJSON),
		})
		if err != nil {
			return err
		}

		// Policy
		policyJSON, err := json.Marshal(map[string]interface{}{
			"Version": "2012-10-17",
			"Statement": []interface{}{
				map[string]interface{}{
					"Action":   []string{"ec2:Describe*"},
					"Effect":   "Allow",
					"Resource": "*",
				},
			},
		})
		if err != nil {
			return err
		}
		policy, err := iam.NewPolicy(ctx, "mypolicy", &iam.PolicyArgs{
			Policy: pulumi.String(policyJSON),
		})
		if err != nil {
			return err
		}

		// Role Policy Attachment
		_, err = iam.NewRolePolicyAttachment(ctx, "myrolepolicyattachment", &iam.RolePolicyAttachmentArgs{
			Role:      role.ID(),
			PolicyArn: policy.Arn,
		})
		if err != nil {
			return err
		}

		// iam User
		_, err = iam.NewUser(ctx, "myuser", &iam.UserArgs{})
		if err != nil {
			return err
		}

		// iam Group
		_, err = iam.NewGroup(ctx, "mygroup", &iam.GroupArgs{})
		if err != nil {
			return err
		}

		// -- Kinesis --
		_, err = kinesis.NewStream(ctx, "mystream", &kinesis.StreamArgs{
			ShardCount: pulumi.Int(1),
		})
		if err != nil {
			return err
		}

		// -- SQS --
		queue, err := sqs.NewQueue(ctx, "myqueue", &sqs.QueueArgs{})
		if err != nil {
			return err
		}

		// -- SNS --
		topic, err := sns.NewTopic(ctx, "mytopic", &sns.TopicArgs{})
		if err != nil {
			return err
		}

		// Topic Subscription
		_, err = sns.NewTopicSubscription(ctx, "mytopicsubscription", &sns.TopicSubscriptionArgs{
			Topic:    topic.Arn,
			Protocol: pulumi.String("sqs"),
			Endpoint: queue.Arn,
		})
		if err != nil {
			return err
		}

		return nil
	})
}
