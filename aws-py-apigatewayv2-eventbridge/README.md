[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-apigatewayv2-eventbridge/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-apigatewayv2-eventbridge/README.md#gh-dark-mode-only)

# API Gateway V2 to EventBridge

This example creates an AWS API Gateway proxy integration with EventBridge and Lambda. It defines a single API Gateway endpoint that publishes events to an EventBridge event bus and an accompanying event rule that matches those events and invokes a Lambda function.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-west-2
    ```

1.  Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

1.  In a few moments, the API Gateway instance will be up and running and its public URL emitted as a Pulumi [stack output](https://www.pulumi.com/docs/intro/concepts/stack/#outputs):

    ```
    Outputs:
        url: "https://andchh8hg8.execute-api.us-west-2.amazonaws.com/dev"
    ```

1.  Verify the deployment with `curl` and `pulumi logs`:

    ```bash
    curl --data '{"some-key": "some-value"}' --header "Content-Type: application/json" "$(pulumi stack output url)/uploads"
    ```

    ```
    {"Entries":[{"EventId":"cdc44763-6976-286c-9378-7cce674dff81"}],"FailedEntryCount":0}
    ```

    ```bash
    pulumi logs --follow
    ```

    ```
    Collecting logs for stack dev since 2022-01-06T16:18:48.000-08:00.
    ...

    {
        source: 'my-event-source',
        detail: { 'some-key': 'some-value' }
    }
    ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
