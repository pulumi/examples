[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/stack-readme-py/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/stack-readme-py/README.md#gh-dark-mode-only)

# Example stack README in Pulumi Cloud

This example shows how to set up a [Stack README](https://www.pulumi.com/docs/intro/pulumi-cloud/projects-and-stacks/#stack-readme) in Python.

Stack READMEs in [Pulumi Cloud](https://app.pulumi.com/) dynamically update based on Stack Outputs. Stack READMEs interpolate output variables on the stack (${outputs.instances[0].ARN}) so that each stack can construct links to dashboards, shell commands, and other pieces of documentation. All of this content stays up to date as you stand up new stacks, rename resources, and refactor your infrastructure.

To set a Stack README, simply set a Stack Output named `readme` to the value of your templated Stack README file. In this example, we've called the file `Pulumi.README.md`.

#### Example project structure

`./__main__.py`

```python
import pulumi

pulumi.export('strVar', 'foo')
pulumi.export('arrVar', ['fizz', 'buzz'])

# open template readme and read contents into stack output
with open('./Pulumi.README.md') as f:
    pulumi.export('readme', f.read())
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
2. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
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
