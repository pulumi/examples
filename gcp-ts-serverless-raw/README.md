[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-serverless-raw/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-serverless-raw/README.md#gh-dark-mode-only)

# Google Cloud Functions in Python, Go, and TypeScript deployed with TypeScript

This example deploys three Google Cloud Functions. "Hello World" functions are implemented in Python, Go, and TypeScript. The Pulumi program is implemented in TypeScript.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init testing
    ```

2.  Configure your GCP project and region:

    ```bash
    pulumi config set gcp:project <your-gcp-project>
    pulumi config set gcp:region <gcp-region>
    ```

3.  Install dependencies:

    ```bash
    npm install
    ```

4.  Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Previewing changes:
    ...
    Performing changes:
    ...
    info: 6 changes performed:
        + 6 resources created
    Update duration: 1m14s
    ```

5.  Test the deployed functions:

    ```bash
    curl $(pulumi stack output pythonEndpoint)
    curl $(pulumi stack output goEndpoint)
    curl $(pulumi stack output tsEndpoint)
    ```

    ```
    "Hello World!"
    "Hello World!"
    "Hello World!"
    ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```

## TypeScript notes

In the `typescriptfunc` folder you'll notice more than a function. Some configuration is needed to inform GCP how to build TypeScript for the Node.js runtime environment. See [this example from Google for more details](https://github.com/GoogleCloudPlatform/functions-framework-nodejs/blob/master/docs/typescript.md).
