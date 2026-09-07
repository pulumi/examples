[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-ts-oidc-provider-pulumi-cloud/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-ts-oidc-provider-pulumi-cloud/README.md#gh-dark-mode-only)

# Azure OIDC Pulumi program in TypeScript

This example will create OIDC configuration between Pulumi Cloud and Azure, specifically demonstrating connectivity with [Pulumi ESC](https://www.pulumi.com/docs/pulumi-cloud/esc/). The program automates the process detailed in the Azure documentation for the following activities:

- [Create a Microsoft Entra application and service principal that can access resources](https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal)
- [Create federated credentials](https://azure.github.io/azure-workload-identity/docs/topics/federated-identity-credential.html#federated-identity-credential-for-an-azure-ad-application-1)

Last update: September 2025

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure Credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
4. A [Pulumi Cloud account](https://app.pulumi.com/signup)

## Deploying the example

This Pulumi example is written as a template. It is meant to be copied via `pulumi new`.

1.  Log in to your Pulumi Cloud account if you haven't already:

    ```bash
    pulumi login
    ```

1.  Copy the template to a new directory (`--dir` is optional; the current directory is used if omitted):

    ```bash
    my_dir=my-azure-oidc
    pulumi new https://github.com/pulumi/examples/azure-ts-oidc-provider-pulumi-cloud --dir ${my_dir}
    cd ${my_dir}
    ```

    Once copied to your machine, feel free to edit as needed.

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Deploy your infrastructure. This template will pick up the thumbprint from the URL that you set in the stack configuration. By default it will use the OIDC IDP URL for Pulumi Cloud.

    ```bash
    pulumi up
    ```

## Cleaning up

To clean up your infrastructure, run:

```bash
pulumi destroy
pulumi stack rm
```
