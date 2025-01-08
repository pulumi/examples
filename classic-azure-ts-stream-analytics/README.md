[![Deploy this example with Pulumi](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-stream-analytics/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-stream-analytics/README.md#gh-dark-mode-only)

# Azure Stream Analytics

An example Pulumi program that deploys an Azure Stream Analytics job to transform data in an Event Hub.

## Running the App

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1. Restore NPM dependencies:

    ```bash
    npm install
    ```

1. Configure the Azure location and subscription to deploy the example to:

    ```bash
    pulumi config set azure:location <location>
    pulumi config set azure:subscriptionId <YOUR_SUBSCRIPTION_ID>
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```console
    $ pulumi up
    Previewing update (dev):
    ...

    Updating (dev):
    ...
    Resources:
      + 15 created
    Update duration: 2m43s
    ```

1. Use the following sample messages for testing:

    ```jsonc
    // Inputs (1 line - 1 event):
    {"Make":"Kia","Sales":2,"Time":"2019-06-26T10:22:36Z"}
    {"Make":"Kia","Sales":1,"Time":"2019-06-26T10:22:37Z"}
    {"Make":"Honda","Sales":1,"Time":"2019-06-26T10:22:38Z"}

    // Output:
    [{"Make":"Kia","Sales":3};{"Make":"Honda","Sales":1}]

    ```

    You can send a message with a `curl` command:

    ```bash
    curl -X POST '$(pulumi stack output inputEndpoint)' -H 'Authorization: $(pulumi stack output sasToken)' -H 'Content-Type: application/atom+xml;type=entry;charset=utf-8' -d '{"Make":"Kia","Sales":2,"Time":"2019-06-26T10:22:36Z"}'
    ```

1. [Start the Stream Analytics job](https://docs.microsoft.com/en-us/azure/stream-analytics/start-job). The job will start emitting messages to the output Event Hub once per minute. The Azure Function `analytics-output` will start printing those events into the console (you'd have to open the function console in the Azure portal to see them).
