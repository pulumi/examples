[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/testing-unit-go-components/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/testing-unit-go-components/README.md#gh-dark-mode-only)

# Unit Testing Pulumi Programs with Components in Go

An example of writing mock-based unit tests written in Go, involving Pulumi Components such as Helm Chart v4.

The program code to be tested (main.go:NewNginxComponent) consists of a code block that creates a Helm Chart resource,
locates the Service resource that is created by the chart, and then extracts the assigned ingress IP for later use.
The test program uses mocking to simulate the behavior of the Helm Chart resource.

## Prerequisites

[Install Go](https://golang.org/doc/install).

## Running the tests

2.  Run the tests:

    ```
    $ go test

    PASS
    ok  	testing-unit-go-components	0.400s
    ```

## Further steps

Learn more about testing Pulumi programs:

- [Testing Guide](https://www.pulumi.com/docs/guides/testing/)
- [Unit Testing Guide](https://www.pulumi.com/docs/guides/testing/unit/)