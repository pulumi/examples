module aws-go-eks

go 1.16

replace github.com/pulumi/pulumi/sdk/v3 => /home/tgummerer/work/pulumi/default-providers/sdk

require (
	github.com/pulumi/pulumi-aws/sdk/v6 v6.0.2
	github.com/pulumi/pulumi-kubernetes/sdk/v3 v3.19.1
	github.com/pulumi/pulumi/sdk/v3 v3.116.1
)
