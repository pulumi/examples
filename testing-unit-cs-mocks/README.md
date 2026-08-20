[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/testing-unit-cs-mocks/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/testing-unit-cs-mocks/README.md#gh-dark-mode-only)

# Unit Testing Pulumi programs in C#

An example of writing mock-based unit tests with both infrastructure definition and tests written in C#.
The example uses the [NUnit](https://nunit.org/) test framework to define and run the tests and [FluentAssertions](https://github.com/fluentassertions/fluentassertions) for assertions.

It defines a stack that deploys a static website to Azure Storage and a suite of tests to validate the deployment. It also shows several examples of changing mocks for the testing needs, including mocking an `Invoke` (data source) call - `ListStorageAccountKeys` - whose result contains a nested array of complex objects.

## Prerequisites

[Install .NET Core 3.1+](https://dotnet.microsoft.com/download)

## Running the tests

Run the tests:

```
$ dotnet test

Microsoft (R) Test Execution Command Line Tool Version 16.3.0
Copyright (c) Microsoft Corporation.  All rights reserved.

Starting test execution, please wait...

A total of 6 test files matched the specified pattern.

Test Run Successful.
Total tests: 6
     Passed: 6
 Total time: 1.2167 Seconds
```

## Mocking `Invoke` (data source) calls

`WebsiteStack.cs` calls `ListStorageAccountKeys` to retrieve the storage account's primary key (for example, to build a connection string for another resource). This kind of call returns a strongly-typed result containing an array of complex objects (`ImmutableArray<StorageAccountKeyResponse>`), which can be confusing to mock.

The key insight, implemented in `Mocks.CallAsync` in `Testing.cs`, is that **you don't need to hand-craft JSON or `JsonElement`s**. The mocking infrastructure serializes whatever you return from `CallAsync` the same way it serializes resource inputs/outputs, so plain `Dictionary<string, object>`/`List<object>` values work, as long as their keys match the camelCase field names of the target type:

```csharp
if (args.Token == "azure-native:storage:listStorageAccountKeys")
{
    outputs.Add("keys", new List<object>
    {
        new Dictionary<string, object>
        {
            { "creationTime", "2020-01-01T00:00:00Z" },
            { "keyName", "key1" },
            { "permissions", "Full" },
            { "value", "mock-storage-account-key" },
        },
    });
    return Task.FromResult((object)outputs.ToImmutable());
}
```

`WebsiteStack.cs` also shows a preferred way to call `Invoke`-style APIs when the arguments depend on other resources' outputs (e.g. `resourceGroupName`, `accountName`): wrap the `*.InvokeAsync(...)` call in `Output.Tuple(...).Apply(...)` rather than using the `*.Invoke(...)` Output-returning overload directly, which can behave unreliably in that situation.

## Further steps

Learn more about testing Pulumi programs:

- [Testing Guide](https://www.pulumi.com/docs/guides/testing/)
- [Unit Testing Guide](https://www.pulumi.com/docs/guides/testing/unit/)
