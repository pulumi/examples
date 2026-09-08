[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-functions/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-functions/README.md#gh-dark-mode-only)

# Google Cloud Functions

An example of deploying an HTTP Google Cloud Function endpoint using TypeScript.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init gcp-fn
    ```

2.  Configure your GCP project and region:

    ```bash
    pulumi config set gcp:project <projectname>
    pulumi config set gcp:region <region>
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
    Update duration: 39.65130324s
    ```

5.  Check the deployed function endpoint:

    ```bash
    pulumi stack output url
    curl "$(pulumi stack output url)"
    ```

    ```
    https://us-central1-pulumi-development.cloudfunctions.net/greeting-function-7f95447
    Greetings from Google Cloud Functions!
    ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
