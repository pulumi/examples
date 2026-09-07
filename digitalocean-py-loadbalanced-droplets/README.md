[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/digitalocean-py-loadbalanced-droplets/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/digitalocean-py-loadbalanced-droplets/README.md#gh-dark-mode-only)

# Load-balanced droplets on DigitalOcean

Starting point for building a Pulumi sample architecture on DigitalOcean. This example provisions a set of load-balanced droplets behind a DigitalOcean load balancer, in Python.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure DigitalOcean credentials](https://www.pulumi.com/docs/intro/cloud-providers/digitalocean/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1.  Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init dev
    ```

1.  Set your DigitalOcean personal access token:

    ```bash
    pulumi config set --secret digitalocean:token YOURDIGITALOCEANTOKEN
    ```

1.  Create a Python virtualenv, activate it, and install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev):

         Type                              Name                                   Status
     +   pulumi:pulumi:Stack                 digitalocean-py-loadbalanced-droplets  created
     +   ├─ digitalocean:index:Tag           demo-app                               created
     +   ├─ digitalocean:index:Tag           web-2                                  created
     +   ├─ digitalocean:index:Tag           web-0                                  created
     +   ├─ digitalocean:index:Tag           web-1                                  created
     +   ├─ digitalocean:index:LoadBalancer  public                                 created
     +   ├─ digitalocean:index:Droplet       web-0                                  created
     +   ├─ digitalocean:index:Droplet       web-2                                  created
     +   └─ digitalocean:index:Droplet       web-1                                  created

    Outputs:
        endpoint: "138.197.62.183"

    Resources:
        + 9 created

    Duration: 3m2s
    ```

1.  Curl the HTTP server:

    ```bash
    curl "$(pulumi stack output endpoint)"
    ```

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```
