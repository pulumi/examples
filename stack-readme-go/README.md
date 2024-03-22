[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/stack-readme-go/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/stack-readme-go/README.md#gh-dark-mode-only)

# Example Stack README in Pulumi Cloud

This example shows how to set up a [Stack Readme](https://www.pulumi.com/docs/intro/pulumi-cloud/projects-and-stacks/#stack-readme) in Go.

Stack READMEs in [Pulumi Cloud](https://app.pulumi.com/) dynamically update based on Stack Outputs. Stack READMEs interpolate output variables on the stack (${outputs.instances[0].ARN}) so that each stack can construct links to dashboards, shell commands, and other pieces of documentation. All of this content stays up to date as you stand up new stacks, rename resources, and refactor your infrastructure.

To set a Stack README, simply set Stack Output named `readme` to the value of your templated Stack README file. In this example, we've called the file `Pulumi.README.md`

#### Example Project Structure

`./main.go`

```go
func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {

		strVar := "foo"
		arrVar := []string{"fizz", "buzz"}

		readmeBytes, err := ioutil.ReadFile("./Pulumi.README.md")
		if err != nil {
			return fmt.Errorf("failed to read readme: %w", err)
		}
		ctx.Export("strVar", pulumi.String(strVar))
		ctx.Export("arrVar", pulumi.ToStringArray(arrVar))
		ctx.Export("readme", pulumi.String(string(readmeBytes)))

		return nil
	})
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
