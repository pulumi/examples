[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/random-yaml/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/random-yaml/README.md#gh-dark-mode-only)

# Generate secure random passwords to use in deployments

The [Random package](https://www.pulumi.com/registry/packages/random/api-docs/) provides resources with outputs that are random IDs, passwords, or other data.

## Deploying and running the program

1.  Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1.  Install required plugins:

    ```bash
    $ pulumi plugin install resource random 4.3.1
    ```

1.  Run `pulumi up` to preview and deploy changes.  After the preview is shown you will be
    prompted if you want to continue or not.

    ```bash
    $ pulumi up
    Previewing update (dev)
    ...

    Updating (dev)

    View Live: https://app.pulumi.com/.../random/dev/updates/1

         Type                            Name            Status
     +   pulumi:pulumi:Stack             random-dev      created
     +   └─ random:index:RandomPassword  randomPassword  created

    Outputs:
    password: "[secret]"

    Resources:
    + 2 created
    ```

1.  To see the resources that were created, run `pulumi stack output`:

    ```bash
    $ pulumi stack output --show-secrets
    Current stack outputs (1):
        OUTPUT      VALUE
        password    ...
    ```
