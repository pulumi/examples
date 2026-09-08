# Integration testing of Pulumi programs in Go

This integration test treats infrastructure deployed by a Pulumi program as a "black box". It deploys the infrastructure, retrieves an endpoint from stack outputs, sends an HTTP request to the endpoint, validates the response, and tears down the infrastructure again.

This test deploys a static website as an AWS S3 bucket and checks that the site is reachable.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Go](https://www.pulumi.com/docs/intro/languages/go/)

## Running the tests

Run the tests:

```bash
go test
```

You should see output similar to the following:

```
PASS
ok  	github.com/pulumi/examples/testing-integration	65.749s
```

## Learn more

Learn more about testing Pulumi programs:

- [Testing Guide](https://www.pulumi.com/docs/iac/guides/testing/)
- [Integration Testing Guide](https://www.pulumi.com/docs/iac/guides/testing/integration/)
