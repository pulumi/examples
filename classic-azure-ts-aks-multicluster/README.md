[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-aks-multicluster/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-aks-multicluster/README.md#gh-dark-mode-only)

# Multiple Azure Kubernetes Service (AKS) Clusters

This example demonstrates creating multiple Azure Kubernetes Service (AKS) clusters in different regions and with
different node counts. Please see https://docs.microsoft.com/en-us/azure/aks/ for more information about AKS.

## Prerequisites

Ensure you have [downloaded and installed the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/).

We will be deploying to Azure, so you will need an Azure account. If you don't have an account,
[sign up for free here](https://azure.microsoft.com/en-us/free/).
[Follow the instructions here](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/) to connect Pulumi to your Azure account.

## Running the Example

> **Note**: Due to an issue in the Azure Terraform Provider (https://github.com/terraform-providers/terraform-provider-azurerm/issues/1635) the
> creation of an Azure Service Principal, which is needed to create the Kubernetes cluster (see index.ts), is delayed and may not
> be available when the cluster is created.  If you get a Service Principal not found error, as a work around, you should be able to run `pulumi up`
> again, at which time the Service Principal should have been created.

After cloning this repo, `cd` into it and run these commands.

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```

2. Set the required configuration variables for this program:

    ```bash
    $ pulumi config set azure:environment public
    $ pulumi config set password --secret [your-cluster-password-here]
    $ ssh-keygen -t rsa -f key.rsa
    $ pulumi config set sshPublicKey < key.rsa.pub
    ```

3. Deploy everything with the `pulumi up` command. This provisions all the Azure resources necessary, including
   an Active Directory service principal and AKS clusters:

    ```bash
    $ pulumi up
    ```

4. After a couple minutes, your AKS clusters will be ready. The AKS cluster names will be printed as output variables
   once `pulumi up` completes.

    ```bash
    $ pulumi up
    ...

    Outputs:
      + aksClusterNames: [
      +     [0]: "akscluster-east513be264"
      +     [1]: "akscluster-westece285c7"
        ]
    ...
    ```

5. At this point, you have multiple AKS clusters running in different regions. Feel free to modify your program, and
   run `pulumi up` to redeploy changes. The Pulumi CLI automatically detects what has changed and makes the minimal
   edits necessary to accomplish these changes.

6. Once you are done, you can destroy all of the resources, and the stack:

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```
