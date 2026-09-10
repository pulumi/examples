[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/cloudflare-ts-dns/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/cloudflare-ts-dns/README.md#gh-dark-mode-only)

# Manage Cloudflare DNS records

Manages a set of [DNS records](https://developers.cloudflare.com/dns/manage-dns-records/) on a
Cloudflare zone — an `A` record, a `CNAME`, and a `TXT` record.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/install/)
1. [Install Node.js](https://www.pulumi.com/docs/iac/languages-sdks/javascript/)
1. A domain already added to Cloudflare as a [zone](https://developers.cloudflare.com/dns/zone-setups/).
1. Create a [Cloudflare API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
   with DNS edit permissions, and export it:

   ```bash
   export CLOUDFLARE_API_TOKEN=<your-token>
   ```

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the zone to manage (find the zone ID on your domain's overview page in the Cloudflare dashboard):

    ```bash
    pulumi config set zoneId <your-zone-id>
    ```

1.  Install dependencies and deploy:

    ```bash
    npm install
    pulumi up
    ```

1.  Inspect the created records:

    ```bash
    pulumi stack output records
    ```

## Cleaning up

```bash
pulumi destroy
pulumi stack rm dev
```
