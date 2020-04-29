# Integration Testing of Pulumi programs in Go

This integration test treats infrastucture deployed by a Pulumi program as a "black box". If deploys the infrastructure, retrieves an endpoint from stack outputs, sends an HTTP request to the endpoint, validates the response, and tears down the infrastructure again.

This test deploys a static website as an AWS S3 bucket and checks that the site is reachable.

## Prerequisites

1. [Install Go](https://golang.org/doc/install).
2. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/).
3. [Configure Pulumi to Use AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/) (if your AWS CLI is configured, no further changes are required).

## Running the tests

Run the tests:

``` 
$ go test

...

PASS
ok  	github.com/pulumi/examples/testing-integration	65.749s
```

## Further steps

Learn more about testing Pulumi programs:

- [Testing Guide](https://www.pulumi.com/docs/guides/testing/)
- [Integration Testing Guide](https://www.pulumi.com/docs/guides/testing/integration/)
