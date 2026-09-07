[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/stack-readme-go/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/stack-readme-go/README.md#gh-dark-mode-only)

# Example stack README in Pulumi Cloud

This example shows how to set up a [Stack README](https://www.pulumi.com/docs/intro/pulumi-cloud/projects-and-stacks/#stack-readme) in Go.

Stack READMEs in [Pulumi Cloud](https://app.pulumi.com/) dynamically update based on Stack Outputs. Stack READMEs interpolate output variables on the stack (${outputs.instances[0].ARN}) so that each stack can construct links to dashboards, shell commands, and other pieces of documentation. All of this content stays up to date as you stand up new stacks, rename resources, and refactor your infrastructure.

To set a Stack README, simply set a Stack Output named `readme` to the value of your templated Stack README file. In this example, we've called the file `Pulumi.README.md`.

#### Example project structure

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

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install Go](https://www.pulumi.com/docs/intro/languages/go/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Install dependencies:

    ```bash
    go mod download
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

## Viewing the rendered stack README

Open the stack in the Pulumi Cloud console:

```bash
pulumi console
```

Then click the README tab to see the rendered Stack README with your stack outputs interpolated.

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it:

```bash
pulumi destroy
pulumi stack rm
```
