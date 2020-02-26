package main

import (
	"fmt"

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

		config := config.New(ctx, "")
		slackWebhookURL := config.Require("slackWebhookURL")
		slackMessageUsername := config.Get("slackMessageUsername")
		slackMessageText := config.Get("slackMessageText")

		callerIdentity, err := aws.GetCallerIdentity(ctx)
		if err != nil {
			return err
		}

		bucket, err := s3.NewBucket(ctx, ctx.Stack(), &s3.BucketArgs{})
		if err != nil {
			return err
		}

		bucketPolicy, err := s3.NewBucketPolicy(ctx, ctx.Stack(), &s3.BucketPolicyArgs{
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
		})
		if err != nil {
			return err
		}

		_, err = cloudtrail.NewTrail(ctx, ctx.Stack(), &cloudtrail.TrailArgs{
			S3BucketName: bucket.Bucket,
			EventSelectors: cloudtrail.TrailEventSelectorArray{
				cloudtrail.TrailEventSelectorArgs{
					IncludeManagementEvents: pulumi.Bool(true),
					ReadWriteType:           pulumi.String("WriteOnly"),
				},
			},
		}, pulumi.DependsOn([]pulumi.Resource{bucket, bucketPolicy}))
		if err != nil {
			return err
		}

		lambdaRole, err := iam.NewRole(ctx, ctx.Stack(), &iam.RoleArgs{
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
		})
		if err != nil {
			return err
		}

		logPolicy, err := iam.NewRolePolicy(ctx, ctx.Stack(), &iam.RolePolicyArgs{
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
		})

		function, err := lambda.NewFunction(ctx, ctx.Stack(), &lambda.FunctionArgs{
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
		}, pulumi.DependsOn([]pulumi.Resource{logPolicy}))
		if err != nil {
			return err
		}

		eventRule, err := cloudwatch.NewEventRule(ctx, ctx.Stack(), &cloudwatch.EventRuleArgs{
			EventPattern: pulumi.String(`{
				"detail-type": [
				  "AWS API Call via CloudTrail"
				]
			  }`),
		})
		if err != nil {
			return err
		}

		_, err = lambda.NewPermission(ctx, ctx.Stack(), &lambda.PermissionArgs{
			Action:    pulumi.String("lambda:InvokeFunction"),
			Principal: pulumi.String("events.amazonaws.com"),
			SourceArn: eventRule.Arn,
			Function:  function.Name,
		})

		_, err = cloudwatch.NewEventTarget(ctx, ctx.Stack(), &cloudwatch.EventTargetArgs{
			Rule: eventRule.Name,
			Arn:  function.Arn,
		})
		if err != nil {
			return err
		}

		ctx.Export("lambda", function.Arn)

		return nil
	})
}
