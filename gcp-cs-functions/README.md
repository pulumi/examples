[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-cs-functions/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-cs-functions/README.md#gh-dark-mode-only)

# Google Cloud Functions in Python deployed with C#

This example deploys a Google Cloud Function implemented in Python. The Pulumi program is implemented in C#.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
3. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/)

## Deploying the example

1.  Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init dev
    ```

1.  Set the GCP project and region:

    ```bash
    pulumi config set gcp:project <your-gcp-project>
    pulumi config set gcp:region <gcp-region>
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```bash
    pulumi up
    ```

    ```
    Previewing changes:
    ...

    Performing changes:
    ...
    info: 10 changes performed:
        + 10 resources created
    Update duration: 45s
    ```

1.  Check the deployed function endpoint:

    ```bash
    pulumi stack output PythonEndpoint
    curl "$(pulumi stack output PythonEndpoint)"
    ```

    ```
    https://us-central1-test-1234.cloudfunctions.net/python-func-742a512
    Hello World!
    ```

1.  From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```
