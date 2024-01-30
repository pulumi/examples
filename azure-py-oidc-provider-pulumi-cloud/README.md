[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-oidc-provider-pulumi-cloud/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-py-oidc-provider-pulumi-cloud/README.md#gh-dark-mode-only)

# Provisioning an OIDC Provider in Azure for Pulumi Cloud

This example will create OIDC configuration between Pulumi Cloud and Azure, specifically demonstrating connectivity with [Pulumi ESC](https://www.pulumi.com/docs/pulumi-cloud/esc/). The program automates the process detailed in the Azure documentation for the following activities:

- [Create a Microsoft Entra application and service principal that can access resources](https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal)
- [Create federated credentials](https://azure.github.io/azure-workload-identity/docs/topics/federated-identity-credential.html#federated-identity-credential-for-an-azure-ad-application-1)

## Prerequisites

* [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
* [Configure Pulumi to Use Azure](https://www.pulumi.com/docs/clouds/azure/get-started/begin/)

## Running the Example

Clone [the examples repo](https://github.com/pulumi/examples) and navigate to the folder for this example.

```bash
git clone https://github.com/pulumi/examples.git
cd examples/azure-py-oidc-provider-pulumi-cloud
```

Next, to deploy the application and its infrastructure, follow these steps:

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init dev
    ```

1. Set your Pulumi ESC environment name and desired Azure region:

    ```bash
    pulumi config set environmentName <your-environment-name> # replace with your environment name
    pulumi config set azure-native:location WestUS2 # any valid Azure region will work
    ```

1. Install requirements.

    ```bash
    python3 -m venv venv
    venv/bin/pip install -r requirements.txt
    ```

1. Run `pulumi up -y`. Once the program completes, it will output a YAML template for you to use in the next step.

## Validating the OIDC Configuration

This next section will walk you through validating your OIDC configuration using [Pulumi ESC](https://www.pulumi.com/docs/pulumi-cloud/esc/).

1. Start by [creating a new Pulumi ESC environment](https://www.pulumi.com/docs/pulumi-cloud/esc/get-started/#create-an-environment).
2. Then, copy the template definition from the output in the CLI and paste it into your environment.
3. Save your environment file and run the `pulumi env open <your-pulumi-org>/<your-environment>` command in the CLI. You should see output similar to the following:

```bash
$ pulumi env open myOrg/myEnvironment
{
  "azure": {
    "login": {
      "clientId": "b537....",
      "oidc": {
        "token": "eyJh...."
      },
      "subscriptionId": "0282....",
      "tenantId": "7061...."
    }
  },
  "environmentVariables": {
    "ARM_CLIENT_ID": "b537....",
    "ARM_OIDC_TOKEN": "eyJh....",
    "ARM_SUBSCRIPTION_ID": "0282....",
    "ARM_TENANT_ID": "7061....",
    "ARM_USE_OIDC": "true"
  }
}
```

## Clean-Up Resources

Once you are done, you can destroy all of the resources as well as the stack:

```bash
$ pulumi destroy
$ pulumi stack rm
```
