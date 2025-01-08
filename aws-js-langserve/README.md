# AWS JavaScript LangServe Example

This example demonstrates how to use deploy a simple app using Pulumi in JavaScript.
## Prerequisites

To run this example, you'll need the following tools installed on your machine:

1. [Install Node.js](https://nodejs.org/en/download/)
2. [Install Pulumi](https://www.pulumi.com/docs/install/)
3. [Configure AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
4. [Install Docker](https://docs.docker.com/get-docker/)
5. [Install the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
6. [Install the LangChain CLI](https://python.langchain.com/docs/langserve#installation)

## Deploying to AWS using Pulumi

Set the region with the following command:

```bash
pulumi config set aws:region <region>
```

Run the following command to deploy your LangServe app to AWS:

```bash
git clone https://github.com/pulumi/examples.git
cd examples/aws-js-langserve
pulumi stack init <your-stack-name>
pulumi install
pulumi config set open-api-key --secret # Enter your OpenAI API key
pulumi up
```

This last command will show you a preview of the resources that will be created. After reviewing the changes, you will be prompted to continue. Once confirmed, Pulumi will deploy your LangServe app to AWS.

The whole deployoment process will take a couple of minutes. Once it's done, you will see the URL of your LangServe app in the output.

```bash
Outputs:
    url: "http://<dns>.elb.amazonaws.com"

Resources:
    + 27 created
```

You can now access the LangServe playground by adding `/openai/playground` to the URL you got from the output.

> [!NOTE]  
> It may take a few minutes for the load balancer to be ready to accept requests. If you see a 503 error, wait a few minutes and try again.

## Clean up

To clean up the resources created by this example, run the following command:

```bash
pulumi destroy
```

You will be prompted to confirm the deletion of the resources. Once confirmed, Pulumi will delete all the resources created by this example.
