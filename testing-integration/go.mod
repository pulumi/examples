module github.com/pulumi/examples/testing-integration

go 1.13

require (
	github.com/pkg/errors v0.9.1
	github.com/pulumi/pulumi/pkg/v3 v3.0.0
	github.com/stretchr/testify v1.6.1
)

replace github.com/Azure/go-autorest => github.com/Azure/go-autorest v12.4.3+incompatible
