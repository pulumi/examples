[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/digitalocean-ts-loadbalanced-droplets/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/digitalocean-ts-loadbalanced-droplets/README.md#gh-dark-mode-only)

# Pulumi DigitalOcean Droplets

Starting point for building a Pulumi sample architecture on DigitalOcean.

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init digitalocean-ts-loadbalanced-droplets
    ```

1.  Configure the project:

    ```
    $ pulumi config set --secret digitalocean:token YOURDIGITALOCEANTOKEN
    ```

1.  Restore NPM dependencies:

    ```
    $ npm install
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing update (digitalocean-ts-loadbalanced-droplets):
    ...

Updating (digitalocean-ts-loadbalanced-droplets):

     Type                                Name                                                                         Status
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

1.  Curl the HTTP server:

    ```
    curl "$(pulumi stack output endpoint)"
    ```

1. Cleanup

    ```
    $ pulumi destroy
    $ pulumi stack rm
    ```
