[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-go-functions-raw/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-go-functions-raw/README.md#gh-dark-mode-only)

# Google Cloud Functions in Python deployed with Go

This example deploys a Google Cloud Function implemented in Python. The Pulumi program is implemented in Go.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/) and [set up a service account](https://www.pulumi.com/docs/intro/cloud-providers/gcp/service-account/)
3. [Install Go](https://www.pulumi.com/docs/intro/languages/go/)

## Deploying the example

1.  Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init dev
    ```

1.  Set the GCP project and region:

    ```bash
    pulumi config set gcp:project <gcp-project>
    pulumi config set gcp:region <gcp-region>
    ```

1.  Install dependencies:

    ```bash
    go mod download
    ```

1.  Execute the Pulumi program to deploy your function:

    ```bash
    pulumi up
    ```

1.  Test your function by curl-ing the trigger URL:

    ```bash
    curl $(pulumi stack output function)
    ```

    ```
    "Hello World!"
    ```

1.  From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your function.

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```
