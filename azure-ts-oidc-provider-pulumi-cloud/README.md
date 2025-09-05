[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-ts-oidc-provider-pulumi-cloud/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-ts-oidc-provider-pulumi-cloud/README.md#gh-dark-mode-only)

# Azure OIDC Pulumi program in TypeScript

This example will create OIDC configuration between Pulumi Cloud and Azure, specifically demonstrating connectivity with [Pulumi ESC](https://www.pulumi.com/docs/pulumi-cloud/esc/). The program automates the process detailed in the Azure documentation for the following activities:

- [Create a Microsoft Entra application and service principal that can access resources](https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal)
- [Create federated credentials](https://azure.github.io/azure-workload-identity/docs/topics/federated-identity-credential.html#federated-identity-credential-for-an-azure-ad-application-1)

Last update: September 2025

## 📋 Pre-requisites

- [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
- [Configure Pulumi to Use Azure](https://www.pulumi.com/docs/clouds/azure/get-started/begin/)
- [Pulumi Cloud account](https://app.pulumi.com/signup)
- [npm](https://www.npmjs.com/get-npm)

## 👩‍🏫 Get started

This Pulumi example is written as a template. It is meant to be copied via `pulumi new`

```bash
# login to your Pulumi Cloud if you haven't already
pulumi login

# pick a name for your output directory (--dir is optional. will use current directory if omitted)
my_dir=my-azure-oidc
pulumi new https://github.com/pulumi/examples/azure-ts-oidc-provider-pulumi-cloud --dir ${my_dir}
cd ${my_dir}
```

Once copied to your machine, feel free to edit as needed.

## 🎬 How to run

This template will pick up the thumbprint from the URL that you set in the stack configuration. By default it will use the OIDC IDP URL for Pulumi Cloud.

To deploy your infrastructure, run:

```bash
$ pulumi up
# select 'yes' to confirm the expected changes
# 🎉 Ta-Da!
```

## 🧹 Clean up

To clean up your infrastructure, run:

```bash
$ pulumi destroy
# select 'yes' to confirm the expected changes
```
