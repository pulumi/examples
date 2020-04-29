[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Pulumi DigitalOcean Droplets

Starting point for building a Pulumi sample architecture on DigitalOcean.

## Running the App

1.  Create a new stack:

    ```bash
    $ pulumi stack init digitalocean-ts-loadbalanced-droplets
    ```

1. Configure the project:

    ```bash
    $ pulumi config set --secret digitalocean:token YOURDIGITALOCEANTOKEN
    ```

1. Create a Python virtualenv, activate it, and install dependencies:

    This installs the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program.

    ```bash
    $ python3 -m venv venv
    $ source venv/bin/activate
    $ pip3 install -r requirements.txt
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```bash
    $ pulumi up
    Previewing update (digitalocean-ts-loadbalanced-droplets):
    ...

Updating (digitalocean-ts-loadbalanced-droplets):

     Type                              Name                                                                         Status
 +   pulumi:pulumi:Stack                 digitalocean-ts-loadbalanced-droplets-digitalocean-ts-loadbalanced-droplets  created
 +   ├─ digitalocean:index:Tag           demo-app                                                                     created
 +   ├─ digitalocean:index:Tag           web-2                                                                        created
 +   ├─ digitalocean:index:Tag           web-0                                                                        created
 +   ├─ digitalocean:index:Tag           web-1                                                                        created
 +   ├─ digitalocean:index:LoadBalancer  public                                                                       created
 +   ├─ digitalocean:index:Droplet       web-0                                                                        created
 +   ├─ digitalocean:index:Droplet       web-2                                                                        created
 +   └─ digitalocean:index:Droplet       web-1                                                                        created

Outputs:
    endpoint: "138.197.62.183"

Resources:
    + 9 created

Duration: 3m2s
    ```

1. Curl the HTTP server:

    ```bash
    curl "$(pulumi stack output endpoint)"
    ```

1. Cleanup

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```
