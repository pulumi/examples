[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-py-serverless-raw/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-py-serverless-raw/README.md#gh-dark-mode-only)

# Google Cloud Functions in Python and Go

This example deploys two Google Cloud Functions. "Hello World" functions are implemented in Python and Go. The Pulumi program is implemented in Python.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Configure the project:

    ```bash
    pulumi config set gcp:project <your-gcp-project>
    pulumi config set gcp:region <gcp-region>
    ```

1. Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Preview and deploy changes:

    ```bash
    pulumi up
    ```

    ```
    info: 6 changes performed:
        + 6 resources created
    Update duration: 1m14s
    ```

1. Test it out:

    ```bash
    curl $(pulumi stack output python_endpoint)
    curl $(pulumi stack output go_endpoint)
    ```

    ```
    "Hello World!"
    ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it:

```bash
pulumi destroy
pulumi stack rm
```
