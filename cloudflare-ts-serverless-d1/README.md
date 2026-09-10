[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/cloudflare-ts-serverless-d1/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/cloudflare-ts-serverless-d1/README.md#gh-dark-mode-only)

# Serverless Cloudflare Worker backed by a D1 database

A [Cloudflare Worker](https://developers.cloudflare.com/workers/) that records each visit in a
[D1](https://developers.cloudflare.com/d1/) serverless SQL database and returns the running
total. The Worker is uploaded as a version and deployed with `cloudflare.WorkersDeployment`,
and is served on its `*.workers.dev` subdomain.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/install/)
1. [Install Node.js](https://www.pulumi.com/docs/iac/languages-sdks/javascript/)
1. Create a [Cloudflare API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
   with Workers and D1 edit permissions, and export it:

   ```bash
   export CLOUDFLARE_API_TOKEN=<your-token>
   ```

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set your Cloudflare account ID:

    ```bash
    pulumi config set accountId <your-account-id>
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Run `pulumi up` to deploy:

    ```bash
    pulumi up
    ```

1.  Visit the Worker's URL, refreshing a few times to watch the counter increment:

    ```bash
    curl "$(pulumi stack output url)"
    # Hello, world! This page has been visited 1 times.
    ```

## Cleaning up

```bash
pulumi destroy
pulumi stack rm dev
```
