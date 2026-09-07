[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-aks-multicluster/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-cs-aks-multicluster/README.md#gh-dark-mode-only)

# Multiple Azure Kubernetes Service (AKS) clusters

This example demonstrates creating multiple Azure Kubernetes Service (AKS) clusters in different regions and with
different node counts. Please see https://docs.microsoft.com/en-us/azure/aks/ for more information about AKS.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure Credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/)

## Deploying the example

> **Note**: Due to an issue in the Azure AD Terraform Provider (https://github.com/hashicorp/terraform-provider-azuread/issues/4) the
> creation of an Azure Service Principal, which is needed to create the Kubernetes cluster (see MyStack.cs), is delayed and may not
> be available when the cluster is created. If you get a Service Principal not found error, as a work around, you should be able to run `pulumi up`
> again, at which time the Service Principal should have been created.

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init dev
    ```

1. Set the required configuration variables for this program:

    ```bash
    pulumi config set azure-native:environment public
    pulumi config set password --secret [your-cluster-password-here]
    ssh-keygen -t rsa -f key.rsa
    pulumi config set sshPublicKey < key.rsa.pub
    ```

1. Deploy everything with the `pulumi up` command. This provisions all the Azure resources necessary, including
   an Active Directory service principal and AKS clusters:

    ```bash
    pulumi up
    ```

1. After a couple minutes, your AKS clusters will be ready. The AKS cluster names are printed as output variables
   once `pulumi up` completes:

    ```
    Outputs:
      + aksClusterNames: [
      +     [0]: "akscluster-east513be264"
      +     [1]: "akscluster-westece285c7"
        ]
    ```

1. At this point, you have multiple AKS clusters running in different regions. Feel free to modify your program, and
   run `pulumi up` to redeploy changes. The Pulumi CLI automatically detects what has changed and makes the minimal
   edits necessary to accomplish these changes.

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```
