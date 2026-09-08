# Unit testing Pulumi programs in C#

An example of writing mock-based unit tests with both infrastructure definition and tests written in C#. The example uses the [NUnit](https://nunit.org/) test framework to define and run the tests and [FluentAssertions](https://github.com/fluentassertions/fluentassertions) for assertions.

It defines a stack that deploys a static website to Azure Storage and a suite of tests to validate the deployment. It also shows several examples of changing mocks for the testing needs, including mocking an `Invoke` (data source) call - `ListStorageAccountKeys` - whose result contains a nested array of complex objects.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/)

## Running the tests

Run the tests:

```bash
dotnet test
```

You should see output similar to the following:

```
Microsoft (R) Test Execution Command Line Tool Version 16.3.0
Copyright (c) Microsoft Corporation.  All rights reserved.

Starting test execution, please wait...

A total of 6 test files matched the specified pattern.

Test Run Successful.
Total tests: 6
     Passed: 6
 Total time: 1.2167 Seconds
```

## Learn more

Learn more about testing Pulumi programs:

- [Testing Guide](https://www.pulumi.com/docs/iac/guides/testing/)
- [Unit Testing Guide](https://www.pulumi.com/docs/iac/guides/testing/unit/)
