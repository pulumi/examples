# Example Stack README In the Pulumi Cloud

This example shows how to set up a [Stack Readme](https://www.pulumi.com/docs/intro/pulumi-cloud/projects-and-stacks/#stack-readme) in typescript.

Stack READMEs in the [Pulumi Cloud](https://app.pulumi.com/) dynamically update based on Stack Outputs. Stack READMEs interpolate output variables on the stack (${outputs.instances[0].ARN}) so that each stack can construct links to dashboards, shell commands, and other pieces of documentation. All of this content stays up to date as you stand up new stacks, rename resources, and refactor your infrastructure.

To set a stack readme, simply set Stack Output named `readme` to the value of your templated Stack Readme file. In this example, we've called the file `Pulumi.README.md`


#### Example Project Structure
`./index.ts`
```typescript
import { readFileSync } from "fs";
export const strVar = "foo";
export const arrVar = ["fizz", "buzz"];
// add readme to stack outputs. must be named "readme".
export const readme = readFileSync("./Pulumi.README.md").toString();
```


`./Pulumi.README.md`
```markdown
# Stack README

Full markdown support! Substitute stack outputs dynamically so that links can depend on your infrastructure! Link to dashboards, logs, metrics, and more.

1. Reference a string stack output: ${outputs.strVar}
2. Reference an array stack output: ${outputs.arrVar[1]}
```


#### How to view the rendered stack readme:
Run `pulumi up`, then go to the console by running `pulumi console`. Then click the readme tab
