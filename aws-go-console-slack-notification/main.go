package main

import (
	"fmt"

	AWS "github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ec2"
	"github.com/pulumi/pulumi-aws/sdk/go/aws"
	"github.com/pulumi/pulumi-aws/sdk/go/aws/cloudtrail"
	"github.com/pulumi/pulumi-aws/sdk/go/aws/cloudwatch"
	"github.com/pulumi/pulumi-aws/sdk/go/aws/iam"
	"github.com/pulumi/pulumi-aws/sdk/go/aws/lambda"
	"github.com/pulumi/pulumi-aws/sdk/go/aws/s3"
	"github.com/pulumi/pulumi/sdk/go/pulumi"
	"github.com/pulumi/pulumi/sdk/go/pulumi/config"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		svc := ec2.New(session.New())
		result, err := svc.DescribeRegions(&ec2.DescribeRegionsInput{
			Filters: []*ec2.Filter{
				{
					Name:   AWS.String("opt-in-status"),
					Values: []*string{AWS.String("opt-in-not-required"), AWS.String("opted-in")},
				},
			},
		})
		if err != nil {
			return err
		}

		for _, region := range result.Regions {
			err := deployRegion(ctx, *region.RegionName)
			if err != nil {
				return err
			}
		}

		return nil
	})
}

func deployRegion(ctx *pulumi.Context, RegionName string) error {

	config := config.New(ctx, "")
	slackWebhookURL := config.Require("slackWebhookURL")
	slackMessageUsername := config.Get("slackMessageUsername")
	slackMessageText := config.Get("slackMessageText")

	// use the same logical name for all resources - e.g. '<stack-name>-<region-id>'
	resourceName := fmt.Sprintf("%s-%s", ctx.Stack(), RegionName)

	awsProvider, err := aws.NewProvider(ctx, RegionName, &aws.ProviderArgs{
		Region: pulumi.String(RegionName),
	})
	if err != nil {
		return err
	}

	callerIdentity, err := aws.GetCallerIdentity(ctx, pulumi.Provider(awsProvider))
	if err != nil {
		return err
	}

	bucket, err := s3.NewBucket(ctx, resourceName, &s3.BucketArgs{
		ForceDestroy: pulumi.Bool(true),
	}, pulumi.Provider(awsProvider))
	if err != nil {
		return err
	}

	bucketPolicy, err := s3.NewBucketPolicy(ctx, resourceName, &s3.BucketPolicyArgs{
		Bucket: bucket.Bucket,
		Policy: pulumi.All(bucket.Bucket, callerIdentity.AccountId).ApplyT(func(args []interface{}) pulumi.Input {
			return pulumi.String(fmt.Sprintf(`{
				"Version": "2012-10-17",
				"Statement": [
					{
						"Sid": "AWSCloudTrailAclCheck20150319",
						"Effect": "Allow",
						"Principal": {"Service": "cloudtrail.amazonaws.com"},
						"Action": "s3:GetBucketAcl",
						"Resource": "arn:aws:s3:::%s"
					},
					{
						"Sid": "AWSCloudTrailWrite20150319",
						"Effect": "Allow",
						"Principal": {"Service": "cloudtrail.amazonaws.com"},
						"Action": "s3:PutObject",
						"Resource": "arn:aws:s3:::%s/AWSLogs/%s/*",
						"Condition": {"StringEquals": {"s3:x-amz-acl": "bucket-owner-full-control"}}
					}
				]
			}`, args[0], args[0], args[1]))
		}),
	}, pulumi.Parent(bucket), pulumi.Provider(awsProvider))
	if err != nil {
		return err
	}

	trail, err := cloudtrail.NewTrail(ctx, resourceName, &cloudtrail.TrailArgs{
		S3BucketName: bucket.Bucket,
		EventSelectors: cloudtrail.TrailEventSelectorArray{
			cloudtrail.TrailEventSelectorArgs{
				IncludeManagementEvents: pulumi.Bool(true),
				ReadWriteType:           pulumi.String("WriteOnly"),
			},
		},
	}, pulumi.DependsOn([]pulumi.Resource{bucket, bucketPolicy}), pulumi.Parent(bucket), pulumi.Provider(awsProvider))
	if err != nil {
		return err
	}

	lambdaRole, err := iam.NewRole(ctx, resourceName, &iam.RoleArgs{
		AssumeRolePolicy: pulumi.String(`{
			"Version": "2012-10-17",
			"Statement": [{
				"Sid": "",
				"Effect": "Allow",
				"Principal": {
					"Service": "lambda.amazonaws.com"
				},
				"Action": "sts:AssumeRole"
			}]
		}`),
	}, pulumi.Parent(bucket), pulumi.Provider(awsProvider))
	if err != nil {
		return err
	}

	logPolicy, err := iam.NewRolePolicy(ctx, resourceName, &iam.RolePolicyArgs{
		Role: lambdaRole.Name,
		Policy: pulumi.String(`{
			"Version": "2012-10-17",
			"Statement": [{
				"Effect": "Allow",
				"Action": [
					"logs:CreateLogGroup",
					"logs:CreateLogStream",
					"logs:PutLogEvents"
				],
				"Resource": "arn:aws:logs:*:*:*"
			}]
		}`),
	}, pulumi.Parent(lambdaRole), pulumi.Provider(awsProvider))

	function, err := lambda.NewFunction(ctx, resourceName, &lambda.FunctionArgs{
		Handler: pulumi.String("handler"),
		Runtime: pulumi.String("go1.x"),
		Code:    pulumi.NewFileArchive("./handler/dist/handler.zip"),
		Role:    lambdaRole.Arn,
		Environment: &lambda.FunctionEnvironmentArgs{
			Variables: pulumi.StringMap{
				"SLACK_WEBHOOK_URL":      pulumi.String(slackWebhookURL),
				"SLACK_WEBHOOK_USERNAME": pulumi.String(slackMessageUsername),
				"SLACK_MESSAGE_TEXT":     pulumi.String(slackMessageText),
			},
		},
	}, pulumi.DependsOn([]pulumi.Resource{logPolicy}), pulumi.Parent(lambdaRole), pulumi.Provider(awsProvider))
	if err != nil {
		return err
	}

	eventRule, err := cloudwatch.NewEventRule(ctx, resourceName, &cloudwatch.EventRuleArgs{
		EventPattern: pulumi.String(`{
			"detail-type": [
			  "AWS API Call via CloudTrail"
			]
		  }`),
	}, pulumi.Parent(trail), pulumi.Provider(awsProvider))
	if err != nil {
		return err
	}

	_, err = lambda.NewPermission(ctx, resourceName, &lambda.PermissionArgs{
		Action:    pulumi.String("lambda:InvokeFunction"),
		Principal: pulumi.String("events.amazonaws.com"),
		SourceArn: eventRule.Arn,
		Function:  function.Name,
	}, pulumi.Parent(eventRule), pulumi.Provider(awsProvider))

	_, err = cloudwatch.NewEventTarget(ctx, resourceName, &cloudwatch.EventTargetArgs{
		Rule: eventRule.Name,
		Arn:  function.Arn,
	}, pulumi.Parent(eventRule), pulumi.Provider(awsProvider))
	if err != nil {
		return err
	}

	// ctx.Export("lambda", function.Arn)

	return nil
}
