package main

import (
	"fmt"

	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws"
	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws/cloudtrail"
	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws/cloudwatch"
	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws/iam"
	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws/lambda"
	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws/s3"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi/config"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		config := config.New(ctx, "")

		var regions []string
		config.GetObject("regions", &regions)

		if len(regions) == 0 {
			var err error
			regions, err = getRegions(ctx)
			if err != nil {
				return err
			}
		}

		for _, region := range regions {
			err := upRegion(ctx, region)
			if err != nil {
				return err
			}
		}

		return nil
	})
}

func getRegions(pctx *pulumi.Context) ([]string, error) {
	reg, err := aws.GetRegions(pctx, &aws.GetRegionsArgs{
		Filters: []aws.GetRegionsFilter{
			aws.GetRegionsFilter{
				Name:   "opt-in-status",
				Values: []string{"opt-in-not-required", "opted-in"},
			},
		},
		AllRegions: pulumi.BoolRef(true),
	}, nil)
	if err != nil {
		return nil, err
	}
	return reg.Names, nil
}

func upRegion(ctx *pulumi.Context, regionName string) error {

	config := config.New(ctx, "")
	slackWebhookURL := config.Require("slackWebhookURL")
	slackMessageUsername := config.Get("slackMessageUsername")
	slackMessageText := config.Get("slackMessageText")
	trailObjectExpirationInDays := config.GetInt("trailObjectExpirationInDays")

	// use the same logical name for all resources - e.g. '<stack-name>-<region-name>'
	resourceNamePrefix := config.Get("resourceNamePrefix")
	if resourceNamePrefix == "" {
		resourceNamePrefix = ctx.Stack()
	}
	resourceName := fmt.Sprintf("%s-%s", resourceNamePrefix, regionName)

	awsProvider, err := aws.NewProvider(ctx, resourceName, &aws.ProviderArgs{
		Region: pulumi.String(regionName),
	})
	if err != nil {
		return err
	}

	callerIdentity, err := aws.GetCallerIdentity(ctx, nil, pulumi.Provider(awsProvider))
	if err != nil {
		return err
	}

	bucket, err := s3.NewBucketV2(ctx, resourceName, &s3.BucketV2Args{
		ForceDestroy: pulumi.Bool(true),
	}, pulumi.Provider(awsProvider))
	if err != nil {
		return err
	}

	if trailObjectExpirationInDays != 0 {
		_, err := s3.NewBucketLifecycleConfigurationV2(ctx, resourceName, &s3.BucketLifecycleConfigurationV2Args{
			Bucket: bucket.Bucket,
			Rules: s3.BucketLifecycleConfigurationV2RuleArray{
				s3.BucketLifecycleConfigurationV2RuleArgs{
					Status: pulumi.String("Enabled"),
					Expiration: s3.BucketLifecycleConfigurationV2RuleExpirationArgs{
						Days: pulumi.Int(trailObjectExpirationInDays),
					},
				},
			},
		})
		if err != nil {
			return err
		}
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
	}, pulumi.Provider(awsProvider), pulumi.Parent(bucket))
	if err != nil {
		return err
	}

	_, err = s3.NewBucketPublicAccessBlock(ctx, resourceName, &s3.BucketPublicAccessBlockArgs{
		Bucket:                bucket.Bucket,
		BlockPublicAcls:       pulumi.Bool(true),
		BlockPublicPolicy:     pulumi.Bool(true),
		IgnorePublicAcls:      pulumi.Bool(true),
		RestrictPublicBuckets: pulumi.Bool(true),
	}, pulumi.Provider(awsProvider), pulumi.DependsOn([]pulumi.Resource{bucketPolicy})) // Do bucket changes sequentially to avoid 'A conflicting conditional operation...'
	if err != nil {
		return err
	}

	trail, err := cloudtrail.NewTrail(ctx, resourceName, &cloudtrail.TrailArgs{
		S3BucketName: bucket.Bucket,
		EventSelectors: cloudtrail.TrailEventSelectorArray{
			cloudtrail.TrailEventSelectorArgs{
				ReadWriteType: pulumi.String("WriteOnly"),
			},
		},
	},
		pulumi.Provider(awsProvider), pulumi.Parent(bucket), pulumi.DependsOn([]pulumi.Resource{bucket, bucketPolicy}),
		// Ignore changes to eventSelectors until https://github.com/terraform-providers/terraform-provider-aws/issues/11712 is resolved.
		pulumi.IgnoreChanges([]string{"eventSelectors"}),
	)
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
	}, pulumi.Provider(awsProvider), pulumi.Parent(bucket))
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
	}, pulumi.Provider(awsProvider), pulumi.Parent(lambdaRole))

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
	}, pulumi.Provider(awsProvider), pulumi.Parent(lambdaRole), pulumi.DependsOn([]pulumi.Resource{logPolicy}))
	if err != nil {
		return err
	}

	eventRule, err := cloudwatch.NewEventRule(ctx, resourceName, &cloudwatch.EventRuleArgs{
		EventPattern: pulumi.String(`{
			"detail-type": [
			  "AWS API Call via CloudTrail"
			]
		  }`),
	}, pulumi.Provider(awsProvider), pulumi.Parent(trail))
	if err != nil {
		return err
	}

	_, err = lambda.NewPermission(ctx, resourceName, &lambda.PermissionArgs{
		Action:    pulumi.String("lambda:InvokeFunction"),
		Principal: pulumi.String("events.amazonaws.com"),
		SourceArn: eventRule.Arn,
		Function:  function.Name,
	}, pulumi.Provider(awsProvider), pulumi.Parent(eventRule))

	_, err = cloudwatch.NewEventTarget(ctx, resourceName, &cloudwatch.EventTargetArgs{
		Rule: eventRule.Name,
		Arn:  function.Arn,
	}, pulumi.Provider(awsProvider), pulumi.Parent(eventRule))
	if err != nil {
		return err
	}

	return nil
}
