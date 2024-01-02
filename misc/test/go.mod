module github.com/pulumi/examples

go 1.16

require (
	github.com/aws/aws-sdk-go v1.44.298
	github.com/mitchellh/go-homedir v1.1.0
	github.com/pulumi/pulumi-trace-tool v0.0.0-20240102141925-7d4e059bd999
	github.com/pulumi/pulumi/pkg/v3 v3.99.0
	github.com/pulumi/pulumi/sdk/v3 v3.100.0
	github.com/stretchr/testify v1.8.4
)

replace github.com/Azure/go-autorest => github.com/Azure/go-autorest v14.2.0+incompatible
