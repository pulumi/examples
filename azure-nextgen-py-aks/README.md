[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Azure Kubernetes Service (AKS) Cluster using Azure Next Generation Provider

This example deploys an AKS cluster, creates an Azure Active AD application, creates a Service Principal and sets credentials to manage access to the cluster.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install Python 3.6 or higher](https://www.python.org/downloads/)
3. [Configure Azure Credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)

### Steps

After cloning this repo, from this working directory, run these commands:

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```

1. Create a Python virtualenv, activate it, and install dependencies:

    This installs the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program.

    ```bash
    $ python3 -m venv venv
    $ source venv/bin/activate
    $ pip3 install -r requirements.txt
    ```

1. Initiate pulumi to stand up the cluster

    ```bash
    $ pulumi up
    ```

1. After 3-4 minutes, your cluster will be ready, and the kubeconfig YAML you'll use to connect to the cluster will be available as an output. You can save this kubeconfig to a file like so:

    ```bash
    $ pulumi stack output kubeconfig > kubeconfig.yaml
    ```

    Once you have this file in hand, you can interact with your new cluster as usual via `kubectl`:

    ```bash
    $ KUBECONFIG=./kubeconfig.yaml kubectl get nodes
    ```

1. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

1. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
