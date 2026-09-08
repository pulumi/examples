# Unit testing Pulumi programs with components in Go

An example of writing mock-based unit tests written in Go, involving Pulumi Components such as Helm Chart v4.

The program code to be tested (main.go:NewNginxComponent) consists of a code block that creates a Helm Chart resource, locates the Service resource that is created by the chart, and then extracts the assigned ingress IP for later use. The test program uses mocking to simulate the behavior of the Helm Chart resource.

## Running the tests

Run the tests:

```bash
go test
```

```
PASS
ok  	testing-unit-go-components	0.400s
```

## Learn more

Learn more about testing Pulumi programs:

- [Testing Guide](https://www.pulumi.com/docs/iac/guides/testing/)
- [Unit Testing Guide](https://www.pulumi.com/docs/iac/guides/testing/unit/)
