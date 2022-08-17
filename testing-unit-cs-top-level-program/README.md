# C# Unit Testing with Top-Level Statements

In this example project, we examine how to unit test C# Pulumi programs that are using top-level statements with dotnet SDK v6. These programs look like this

```csharp
using Pulumi;

return await Deployment.RunAsync(() => 
{
    // Create resources here
});
```

In order to unit test this piece of code, we have to do a bit of rewriting such that we don't run the `Deployment.RunAsync` function because it expects the program is being executed from the Pulumi CLI. 

Now, we take the lambda that is provided to `Deployment.RunAsync` and move it in a place where we can reference it later from our unit test project. The following snippet shows this

```csharp
using Pulumi;

return await Deployment.RunAsync(Deploy.Infra);

public class Deploy
{
    public static Dictionary<string, object?> Infra()
    {
        // Create resources here
    }
}
```
Here, the code that creates resources and returns outputs is inside the `Deploy.Infra` function which we can reference from the test project. 

> The return type of `Deploy.Infra` could also have been any of the following 
> - `void` when we are not returning any outputs
> - `Task` when we want to `await` async code
> - `Task<Dictionary<string, object?>>` when we want to `await` async code _and_ return outputs

Now we are ready to write unit tests. From a test project called `Tests`, add a reference to the project that contains the Pulumi program:
```xml
<ItemGroup>
  <ProjectReference Include="..\infra\Infra.csproj" />
</ItemGroup>
```
Now, just for the tests we can create a _test stack_ that uses `Deploy.Infra` as follows
```csharp
class TestStack : Stack
{
    public TestStack()
    {
        Outputs = Deploy.Infra();
    }

    public Dictionary<string, object?> Outputs { get; set; }
}
```
Then, we can use this test stack to build resources and make assertions about them:
```csharp
[Test]
public async Task StackExportsWebsiteUrl()
{
    var options = new TestOptions { IsPreview = false };
	var resources = await Pulumi.Deployment.TestAsync<TestStack>(new Mocks(), options);
	var stack = resources.OfType<TestStack>().First();
	Assert.That(stack.Outputs.ContainsKey("endpoint"), "Stack should have an endpoint output");
    if (stack.Outputs["endpoint"] is Output<string> endpoint)
    {
        var endpointValue = await endpoint.GetValueAsync();
	    endpointValue.Should().Be("https://wwwprodsa.web.core.windows.net");
    }
}
```
The rest of the unit testing constructs such as `Mocks` are covered in the blog post: [Unit Testing Cloud Deployments with .NET](https://www.pulumi.com/blog/unit-testing-cloud-deployments-with-dotnet/)