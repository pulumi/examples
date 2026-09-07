[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-langserve/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-langserve/README.md#gh-dark-mode-only)

# AWS TypeScript LangServe example

This example demonstrates how to deploy a simple LangServe app using Pulumi in TypeScript.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
1. [Install Docker](https://docs.docker.com/get-docker/)
1. [Install the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
1. [Install the LangChain CLI](https://python.langchain.com/docs/langserve#installation)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-west-2
    ```

1.  Set your OpenAI API key:

    ```bash
    pulumi config set open-api-key --secret # Enter your OpenAI API key
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Deploy the stack. This will show you a preview of the resources that will be created. After reviewing the changes, you will be prompted to continue.

    ```bash
    pulumi up
    ```

    The whole deployment process will take a couple of minutes. Once it's done, you will see the URL of your LangServe app in the output.

    ```
    Outputs:
        url: "http://<dns>.elb.amazonaws.com"

    Resources:
        + 27 created
    ```

    You can now access the LangServe playground by adding `/openai/playground` to the URL you got from the output.

    > [!NOTE]
    > It may take a few minutes for the load balancer to be ready to accept requests. If you see a 503 error, wait a few minutes and try again.

## Cleaning up

To clean up the resources created by this example, run:

```bash
pulumi destroy
pulumi stack rm
```
