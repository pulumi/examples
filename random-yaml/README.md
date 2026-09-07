[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/random-yaml/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/random-yaml/README.md#gh-dark-mode-only)

# Generate secure random passwords to use in deployments

The [Random package](https://www.pulumi.com/registry/packages/random/api-docs/) provides resources with outputs that are random IDs, passwords, or other data.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)

## Deploying the example

1. Create a new stack:

   ```bash
   pulumi stack init dev
   ```

1. Install required plugins:

   ```bash
   pulumi plugin install resource random 4.3.1
   ```

1. Run `pulumi up` to preview and deploy changes. After the preview is shown you will be prompted if you want to continue or not.

   ```bash
   pulumi up
   ```

   ```
   Updating (dev)

        Type                            Name            Status
    +   pulumi:pulumi:Stack             random-dev      created
    +   └─ random:index:RandomPassword  randomPassword  created

   Outputs:
   password: "[secret]"

   Resources:
   + 2 created
   ```

1. To see the resources that were created, run `pulumi stack output`:

   ```bash
   pulumi stack output --show-secrets
   ```

   ```
   Current stack outputs (1):
       OUTPUT      VALUE
       password    ...
   ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
