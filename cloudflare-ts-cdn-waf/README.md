[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/cloudflare-ts-cdn-waf/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/cloudflare-ts-cdn-waf/README.md#gh-dark-mode-only)

# Cloudflare CDN and WAF in front of an origin

Puts Cloudflare in front of an existing origin server: a proxied DNS record routes traffic
through Cloudflare, a [cache ruleset](https://developers.cloudflare.com/cache/how-to/cache-rules/)
caches responses at the edge, and a [rate-limiting ruleset](https://developers.cloudflare.com/waf/rate-limiting-rules/)
protects the origin from abuse.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/install/)
1. [Install Node.js](https://www.pulumi.com/docs/iac/languages-sdks/javascript/)
1. A domain already added to Cloudflare as a [zone](https://developers.cloudflare.com/dns/zone-setups/).
1. Create a [Cloudflare API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
   with DNS and Zone WAF edit permissions, and export it:

   ```bash
   export CLOUDFLARE_API_TOKEN=<your-token>
   ```

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Configure the zone and origin:

    ```bash
    pulumi config set zoneId <your-zone-id>
    pulumi config set origin origin.example.com
    ```

1.  Install dependencies and deploy:

    ```bash
    npm install
    pulumi up
    ```

1.  The proxied hostname is exported as `url`:

    ```bash
    pulumi stack output url
    ```

## Cleaning up

```bash
pulumi destroy
pulumi stack rm dev
```
