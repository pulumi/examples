[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-go-functions-raw/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-go-functions-raw/README.md#gh-dark-mode-only)

# Google Cloud Functions in Python deployed with Go

This example deploys a Google Cloud Function implemented in Python. Pulumi program is implemented in Go.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for GCP](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
    - [Set up a Service Account](https://www.pulumi.com/docs/intro/cloud-providers/gcp/service-account/)

### Steps

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1. Set the GCP project and region:

    ```bash
    pulumi config set gcp:project <gcp-project>
    pulumi config set gcp:region <gcp-region>
    ```

1. Execute the pulumi program to deploy our function:

    ```bash
    pulumi up
    ```

1. Test our function by curl-ing the trigger URL.

    ```bash
    curl $(pulumi stack output function)
    # "Hello World!"
    ```

1. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your function.

1. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    pulumi destroy --yes
    pulumi stack rm --yes
    ```
