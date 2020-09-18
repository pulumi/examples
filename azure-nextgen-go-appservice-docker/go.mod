module github.com/pulumi/examples/azure-go-appservice

go 1.13

require (
	github.com/pulumi/pulumi-azure-nextgen/sdk v0.0.0-20200917212940-17e4216af957
	github.com/pulumi/pulumi-docker/sdk/v2 v2.3.0
	github.com/pulumi/pulumi-random/sdk/v2 v2.3.1
	github.com/pulumi/pulumi/sdk/v2 v2.0.0
)

replace github.com/pulumi/pulumi-azure-nextgen/sdk => ../../../go/src/github.com/pulumi/pulumi-azure-nextgen/sdk
