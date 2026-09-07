[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/linode-js-webserver/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/linode-js-webserver/README.md#gh-dark-mode-only)

# Web server on Linode

Starting point for building a Pulumi sample web server on Linode.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Linode credentials](https://www.pulumi.com/registry/packages/linode/installation-configuration/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1. Create a new stack:

   ```bash
   pulumi stack init webserver-linode-testing
   ```

1. Set your Linode API token:

   ```bash
   pulumi config set --secret linode:token YOURLINODETOKEN
   ```

1. Install dependencies:

   ```bash
   npm install
   ```

1. Run `pulumi up` to preview and deploy changes:

   ```bash
   pulumi up
   ```

   ```
   Updating (webserver-linode-testing):

       Type                         Name                                        Status
   +   pulumi:pulumi:Stack          webserver-linode-webserver-linode-testing   created
   +   ├─ linode:index:StackScript  simple-server                               created
   +   └─ linode:index:Instance     instance                                    created

   Outputs:
       instanceIP   : "69.164.221.90"
       instanceLabel: "linode13879908"

   Resources:
       + 3 created

   Duration: 55s
   ```

1. Curl the HTTP server:

   ```bash
   curl $(pulumi stack output instanceIP)
   ```

   ```
   Hello, World!
   ```

1. SSH into the server:

   ```bash
   linode-cli ssh root@$(pulumi stack output instanceLabel)
   ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
