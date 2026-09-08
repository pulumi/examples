[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-oidc-provider-pulumi-cloud/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-oidc-provider-pulumi-cloud/README.md#gh-dark-mode-only)

# GCP OIDC provider for Pulumi Cloud

This Pulumi program enables [Pulumi Cloud](https://app.pulumi.com) to authenticate with an OIDC provider in a Google Cloud project, and creates a Pulumi ESC environment that allows both the [`gcloud` CLI](https://cloud.google.com/sdk/gcloud) and the [Pulumi Google Cloud provider](https://www.pulumi.com/registry/packages/gcp/) to consume temporary (admin) credentials.

Last update: September 2025

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
4. A [Pulumi Cloud account](https://app.pulumi.com/signup)
5. A Google Cloud project

## Deploying the example

This Pulumi example is written as a template. It is meant to be copied via `pulumi new`.

1. Log in to your Pulumi Cloud account if you haven't already:

    ```bash
    pulumi login
    ```

2. Copy the template to a new directory (`--dir` is optional; it will use the current directory if omitted):

    ```bash
    pulumi new https://github.com/pulumi/examples/gcp-ts-oidc-provider-pulumi-cloud --dir my-gcp-oidc
    cd my-gcp-oidc
    ```

    Once copied to your machine, feel free to edit as needed.

3. Install dependencies:

    ```bash
    npm install
    ```

4. Deploy the stack. This template will pick up the thumbprint from the URL that you set in the stack
   configuration. By default it will use the OIDC IDP URL for Pulumi Cloud:

    ```bash
    pulumi up
    ```

    Note: due to propagation delays, the OIDC connection may take a few minutes before it is usable.

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```

## Additional notes

This project is generally useful as a baseline setup for using ESC with Google Cloud. You may want to refine the scope of the accounts permissions (e.g. from `roles/admin` to `roles/writer` or `roles/reader`), or you may want to [import](https://www.pulumi.com/docs/esc/get-started/import-environments/) the generated ESC environment into a new ESC environment to enable scenarios like [accessing Google Secret Manager secrets](https://www.pulumi.com/docs/esc/integrations/dynamic-secrets/gcp-secrets/).
