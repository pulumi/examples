[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-localai-flowise/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-localai-flowise/README.md#gh-dark-mode-only)

# Deploy LocalAI and Flowise on AWS EKS

This example deploys LocalAI and Flowise on an Amazon EKS cluster using Pulumi in TypeScript.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

> If you run Pulumi for the first time, you will be asked to log in. Follow the instructions on the screen to
> login. You may need to create an account first, don't worry it is free.

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region eu-central-1
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Deploy the infrastructure:

    ```bash
    pulumi up
    ```

1.  Port forward the Flowise UI. First, retrieve the kubeconfig file:

    ```bash
    pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml
    ```

    As the program does not deploy a LoadBalancer, you need to port forward the UI to your local machine:

    ```bash
    kubectl port-forward svc/flowise-ui 3000:3000
    ```

## Cleaning up

Once you're finished, destroy the resources and remove the stack:

```bash
pulumi destroy
pulumi stack rm
```
