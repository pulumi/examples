[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-oidc-provider-pulumi-cloud/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-oidc-provider-pulumi-cloud/README.md#gh-dark-mode-only)

# AWS OIDC provider for Pulumi Cloud

A Pulumi program that configures AWS OIDC for use with Pulumi ESC. It:

- Creates AWS resources for AWS OIDC (IdP + Role)
- Creates a new Pulumi Cloud ESC Environment

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
4. A [Pulumi Cloud account](https://app.pulumi.com/signup)

## Deploying the example

This example is also published as a template that you can copy with `pulumi new`:

```bash
pulumi login
pulumi new https://github.com/pulumi/examples/aws-ts-oidc-provider-pulumi-cloud --dir my-aws-oidc
cd my-aws-oidc
```

Once copied to your machine, feel free to edit as needed.

1.  Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region and the ESC project and environment names to generate:

    ```bash
    pulumi config set aws:region us-west-2
    pulumi config set escProject aws
    pulumi config set escEnvironmentName aws-oidc-admin
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Deploy the stack. This template will pick up the thumbprint from the URL that you set in the stack configuration. By default it will use the OIDC IDP URL for Pulumi Cloud.

    ```bash
    pulumi up
    ```

## Cleaning up

To clean up your infrastructure, run:

```bash
pulumi destroy
pulumi stack rm
```
