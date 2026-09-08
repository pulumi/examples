[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-cs-langserve/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-cs-langserve/README.md#gh-dark-mode-only)

# AWS C# LangServe example

This example demonstrates how to deploy a simple LangServe app using Pulumi in C#.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/)
4. [Install Docker](https://docs.docker.com/get-docker/)
5. [Install the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
6. [Install the LangChain CLI](https://python.langchain.com/docs/langserve#installation)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-east-1
    ```

1.  Set your OpenAI API key:

    ```bash
    pulumi config set open-api-key --secret
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

    This command will show you a preview of the resources that will be created. After reviewing the changes, you will be prompted to continue. Once confirmed, Pulumi will deploy your LangServe app to AWS.

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

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
