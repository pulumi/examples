[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/stack-readme-cs/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/stack-readme-cs/README.md#gh-dark-mode-only)

# Example Stack README in Pulumi Cloud

This example shows how to set up a [Stack Readme](https://www.pulumi.com/docs/intro/pulumi-cloud/projects-and-stacks/#stack-readme) in C#.

Stack READMEs in [Pulumi Cloud](https://app.pulumi.com/) dynamically update based on Stack Outputs. Stack READMEs interpolate output variables on the stack (${outputs.instances[0].ARN}) so that each stack can construct links to dashboards, shell commands, and other pieces of documentation. All of this content stays up to date as you stand up new stacks, rename resources, and refactor your infrastructure.

To set a Stack README, simply set Stack Output named `readme` to the value of your templated Stack README file. In this example, we've called the file `Pulumi.README.md`

#### Example Project Structure

`./MyStack.cs`

```csharp
using Pulumi;

class MyStack : Stack
{
    public MyStack()
    {
        this.StrVar = "foo";
        this.ArrVar = new string[] { "fizz", "buzz" };
        this.Readme = System.IO.File.ReadAllText("./Pulumi.README.md");
    }

    [Output]
    public Output<string> StrVar { get; set; }

    [Output]
    public Output<string[]> ArrVar { get; set; }

    [Output]
    public Output<string> Readme { get; set; }

}
```

`./Pulumi.README.md`

```markdown
# Stack README

Full markdown support! Substitute stack outputs dynamically so that links can depend on your infrastructure! Link to dashboards, logs, metrics, and more.

1. Reference a string stack output: ${outputs.strVar}
2. Reference an array stack output: ${outputs.arrVar[1]}
```

#### How to View the Rendered Stack README

Run `pulumi up`, then go to the Pulumi console by running `pulumi console`. Then click the README tab.
