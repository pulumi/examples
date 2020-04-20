module github.com/pulumi/examples/testing-integration

go 1.13

require (
	github.com/pkg/errors v0.8.1
	github.com/pulumi/pulumi/pkg/v2 v2.0.0
	github.com/stretchr/testify v1.4.1-0.20191106224347-f1bd0923b832
)

replace github.com/Azure/go-autorest => github.com/Azure/go-autorest v12.4.3+incompatible
