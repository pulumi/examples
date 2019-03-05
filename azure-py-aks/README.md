[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure Kubernetes Service (AKS) Cluster

This example deploys an AKS cluster, virtual network and Azure Container Registry and grants AKS permissions to access and manage those.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://pulumi.io/install)
2. [Install Python 3.6](https://www.python.org/downloads/)
3. [Configure Azure Credentials](https://pulumi.io/install/azure.html)
4. [Generate SSH Key](https://git-scm.com/book/en/v2/Git-on-the-Server-Generating-Your-SSH-Public-Key)

### Steps

After cloning this repo, from this working directory, run these commands:

1. Install the required Python packages packages:

    ```bash
    $ pip install -r requirements.txt
    ```

2. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```

3. Set the configuration variables for this program:

    ```bash
    $ pulumi config set prefix all_resources_will_be_prefixed_with_this_value
    $ pulumi config set password service_principal_password
    $ pulumi config set sshkey < ~/.ssh/id_rsa.pub
    $ # this has a default value, so you can skip it
    $ pulumi config set location any_valid_azure_location_for_aks
    ```

4. Stand up the AKS cluster:

    ```bash
    $ pulumi up
    ```

5. After 10-15 minutes, your cluster will be ready, and the kubeconfig YAML you'll use to connect to the cluster will be available as an output. You can save this kubeconfig to a file like so:

    ```bash
    $ pulumi stack output kubeconfig > kubeconfig.yaml
    ```

    Once you have this file in hand, you can interact with your new cluster as usual via `kubectl`:

    ```bash
    $ KUBECONFIG=./kubeconfig.yaml kubectl get nodes
    ```
6. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

7. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
