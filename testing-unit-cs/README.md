[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/testing-unit-cs/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/testing-unit-cs/README.md#gh-dark-mode-only)

# Unit Testing Pulumi programs in C#

An example of writing mock-based unit tests with both infrastructure definition and tests written in C#. The example uses the [NUnit](https://nunit.org/) test framework to define and run the tests, [Moq](https://github.com/moq/moq4) for mocks, and [FluentAssertions](https://github.com/fluentassertions/fluentassertions) for assertions.

## Prerequisites

[Install .NET Core 3.1+](https://dotnet.microsoft.com/download)

## Running the tests

Run the tests:

```
$ dotnet test

Microsoft (R) Test Execution Command Line Tool Version 16.3.0
Copyright (c) Microsoft Corporation.  All rights reserved.

Starting test execution, please wait...

A total of 1 test files matched the specified pattern.

Test Run Successful.
Total tests: 1
     Passed: 1
 Total time: 1.2167 Seconds
```

## Further steps

Learn more about testing Pulumi programs:

- [Testing Guide](https://www.pulumi.com/docs/guides/testing/)
- [Unit Testing Guide](https://www.pulumi.com/docs/guides/testing/unit/)
