[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-hcl-webserver/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-hcl-webserver/README.md#gh-dark-mode-only)

# Web Server on Google Compute Engine, Written in HCL

A simple web server running on a Google Compute Engine instance, written in
[Pulumi HCL](https://www.pulumi.com/docs/languages-sdks/hcl/). Pulumi installs the HCL language
plugin and the Terraform Google provider automatically the first time you run the program.

## Deploying and running the program

1.  Create a new stack:

    ```bash
    $ pulumi stack init webserver-testing
    ```

1.  [Configure your GCP credentials](https://www.pulumi.com/registry/packages/gcp/installation-configuration/)
    and set the project and zone to deploy into:

    ```bash
    $ export GOOGLE_PROJECT=my-project
    $ export GOOGLE_ZONE=us-central1-a
    ```

1.  Run `pulumi up` to preview and deploy changes. After the preview is shown you will be
    prompted if you want to continue or not.

1.  Curl the HTTP server:

    ```bash
    $ curl $(pulumi stack output instance_ip)
    Hello, World!
    ```

    The instance may take a minute to boot and start serving after the deployment finishes.

1.  To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
