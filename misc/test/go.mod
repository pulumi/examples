module github.com/pulumi/examples

go 1.13

require (
	github.com/aws/aws-sdk-go v1.30.7
	github.com/mitchellh/go-homedir v1.1.0
	github.com/onsi/ginkgo v1.12.0 // indirect
	github.com/onsi/gomega v1.9.0 // indirect
	github.com/pulumi/pulumi/pkg/v2 v2.4.1-0.20200623000229-a7d6ea6dd819
	github.com/pulumi/pulumi/sdk/v2 v2.4.1-0.20200623000229-a7d6ea6dd819
	github.com/stretchr/testify v1.6.1
	gopkg.in/airbrake/gobrake.v2 v2.0.9 // indirect
	gopkg.in/gemnasium/logrus-airbrake-hook.v2 v2.1.2 // indirect
)

replace github.com/Azure/go-autorest => github.com/Azure/go-autorest v12.4.3+incompatible
