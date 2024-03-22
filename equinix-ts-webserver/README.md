[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/equinix-ts-webserver/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/equinix-ts-webserver/README.md#gh-dark-mode-only)

# Equinix Webserver

This example demonstrates creating a webserver in Equinix

# Running the Example

After cloning this repo, `cd` into it and run these commands.

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```

1. Install all of the dependencies for the application:

    ```bash
    $ npm install
    ```

1. Deploy everything with the `pulumi up` command. This provisions the webserver:

    ```bash
    $ pulumi up
    ```

1. After a couple minutes, your webserver will be ready.

    ```bash
    $ pulumi up
    ...

    Outputs:
      + ip  : "147.75.65.213"
      + name: "new-vervet"
    ```

1. Once you are done, you can destroy all of the resources, and the stack:

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```
