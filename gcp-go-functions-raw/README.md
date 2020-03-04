[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Google Cloud Functions in Python deployed with Go

This example deploys a Google Cloud Function implemented in Python. Pulumi program is implemented in Go.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for GCP](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
    - [Set up a Service Account](https://www.pulumi.com/docs/intro/cloud-providers/gcp/service-account/)

### Steps

1. Restore your Go dependencies. This example currently uses [Dep](https://github.com/golang/dep) to do so:

    ```bash
    $ dep ensure
    ```

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