module github.com/pulumi/examples

go 1.16

require (
	github.com/aws/aws-sdk-go v1.38.35
	github.com/mitchellh/go-homedir v1.1.0
	github.com/pulumi/pulumi-trace-tool v0.0.0-20210629202931-10ae87ca9439
	github.com/pulumi/pulumi/pkg/v3 v3.5.1
	github.com/pulumi/pulumi/sdk/v3 v3.5.1
	github.com/stretchr/testify v1.7.0
)

replace github.com/Azure/go-autorest => github.com/Azure/go-autorest v14.2.0+incompatible
