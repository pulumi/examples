// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

package test

import (
	"fmt"
	"os"
	"testing"

	"github.com/pulumi/examples/misc/test/helpers"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
)

func getCwd(t *testing.T) string {
	return helpers.GetCwd(t)
}

func getBaseOptions(t *testing.T) integration.ProgramTestOptions {
	overrides, err := integration.DecodeMapString(os.Getenv("PULUMI_TEST_NODE_OVERRIDES"))
	if err != nil {
		t.FailNow()
	}

	base := integration.ProgramTestOptions{
		ExpectRefreshChanges:     true,
		Overrides:                overrides,
		RetryFailedSteps:         true,
		AllowEmptyPreviewChanges: true,
		AllowEmptyUpdateChanges:  true,
		InstallDevReleases:       true,
	}

	return base
}

// Below: aws-specifics shared so that -tags Performance and -tags Aws compilation works.

func getAWSBase(t *testing.T) integration.ProgramTestOptions {
	awsRegion := getAwsRegion()
	base := getBaseOptions(t)
	awsBase := base.With(integration.ProgramTestOptions{
		Config: map[string]string{
			"aws:region": awsRegion,
		},
		AllowEmptyPreviewChanges: true,
		AllowEmptyUpdateChanges:  true,
	})
	return awsBase
}

func getAwsRegion() string {
	awsRegion := os.Getenv("AWS_REGION")
	if awsRegion == "" {
		awsRegion = "us-west-1"
		fmt.Println("Defaulting AWS_REGION to 'us-west-1'.  You can override using the AWS_REGION environment variable")
	}

	return awsRegion
}
