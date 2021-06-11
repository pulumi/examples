module github.com/pulumi/examples

go 1.16

require (
	github.com/aws/aws-sdk-go v1.38.35
	github.com/mitchellh/go-homedir v1.1.0
	github.com/pulumi/pulumi/pkg/v3 v3.0.0
	github.com/pulumi/pulumi/sdk/v3 v3.3.1
	github.com/stretchr/testify v1.6.1
	gopkg.in/airbrake/gobrake.v2 v2.0.9 // indirect
	gopkg.in/gemnasium/logrus-airbrake-hook.v2 v2.1.2 // indirect
)

replace github.com/Azure/go-autorest => github.com/Azure/go-autorest v14.2.0+incompatible

replace github.com/pulumi/pulumi/pkg/v3 => github.com/pulumi/pulumi/pkg/v3 v3.4.1-0.20210611165853-02c33000552c

replace github.com/pulumi/pulumi/sdk/v3 => github.com/pulumi/pulumi/sdk/v3 v3.4.1-0.20210611165853-02c33000552c
