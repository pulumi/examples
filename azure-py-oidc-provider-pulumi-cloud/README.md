# Provisioning an OIDC Provider in Azure for Pulumi Cloud

This example will create OIDC configuration between Pulumi Cloud and Azure, specifically demonstrating connectivity with [Pulumi ESC](https://www.pulumi.com/docs/pulumi-cloud/esc/). The program automates the process detailed in the Azure documentation for the following activities:

- [Create a Microsoft Entra application and service principal that can access resources](https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal)
- [Create federated credentials](https://azure.github.io/azure-workload-identity/docs/topics/federated-identity-credential.html#federated-identity-credential-for-an-azure-ad-application-1)

## Prerequisites

* [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
* [Configure Pulumi to Use Azure](https://www.pulumi.com/docs/clouds/azure/get-started/begin/)

## Running the Example

Clone [the examples repo](https://github.com/pulumi/examples/tree/master/azure-py-oidc-provider) and navigate to the folder for this example.

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

Start by [creating a new Pulumi ESC environment](https://www.pulumi.com/docs/pulumi-cloud/esc/get-started/#create-an-environment). Then, copy the template definition from the output in the CLI and paste it into your environment. Save your environment file and run the `pulumi env open <your-pulumi-org>/<your-environment>` command in the CLI. You should see output similar to the following:

```bash
$ pulumi env open myOrg/myEnvironment
{
  "azure": {
    "login": {
      "clientId": "3e5505f6-90b9-....",
      "oidc": {
        "token": "eyJhbGciOi...."
      },
      "subscriptionId": "/subscriptions/0282681f-7a9e....",
      "tenantId": "706143bc-e1d4...."
    }
  }
}
```

## Additional Considerations

You can configure more granular access control by adding a `RoleAssignment` resource to your program. In the following example, the application is assigned a role with permissions to read secrets from Azure Keyvault.

```python
# Create an IAM role assignment at the subscription level
role_assignment = authorization.RoleAssignment(
    'role-assignment',
    scope=pulumi.Output.format('/subscriptions/{subscription_id}', subscription_id=az_subscription),
    role_definition_id=pulumi.Output.format('/subscriptions/{subscription_id}/providers/Microsoft.Authorization/roleDefinitions/{role_definition_id}',
                                            subscription_id=az_subscription,
                                            role_definition_id='4633458b-17de-408a-b874-0445c86b69e6'),  # ID for "Key Vault Secrets User" role
    principal_id=application.object_id,
)
```

For this example, you would need to update your environment file to retrieve a KeyVault secret:

```yaml
values:
  azure:
    login:
      fn::open::azure-login:
        clientId: <your-client-id>
        tenantId: <your-tenant-id>
        subscriptionId: /subscriptions/<your-subscription-id>
        oidc: true
    secrets:
      fn::open::azure-secrets:
        login: ${azure.login}
        vault: <your-vault-name>
        get:
          api-key:
            name: api-key #an example of retrieving a secret named "api-key" and storing it in a parameter
  environmentVariables:
    API_KEY: ${azure.secrets.api-key} # an example of how you can reference your api-key value elsewhere in the file
```

## Clean-Up Resources

Once you are done, you can destroy all of the resources as well as the stack:

```bash
$ pulumi destroy
$ pulumi stack rm
```
