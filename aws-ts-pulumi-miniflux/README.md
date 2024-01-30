[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-pulumi-miniflux/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-pulumi-miniflux/README.md#gh-dark-mode-only)

# Run an RSS Service with Miniflux

[Miniflux](https://miniflux.app/) is an open-source RSS service written in Go and backed by PostgreSQL. This example demonstrates how to stand up a Miniflux service using AWS Fargate and RDS.

[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-pulumi-miniflux/README.md)

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/).
1. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/).
1. Configure your [AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/).

### Deploying the App

1. Clone this repo, change to this directory, then create a new [stack](https://www.pulumi.com/docs/intro/concepts/stack/) for the project:

    ```bash
    pulumi stack init
    ```

1. Apply the required configuration properties, making adjustments as you like, and taking care to choose strong passwords for the database user and service administrator (which will be stored as encrypted [Pulumi secrets](https://www.pulumi.com/docs/intro/concepts/secrets/):

    ```bash
    pulumi config set aws:region us-west-2
    pulumi config set db_name miniflux
    pulumi config set db_username miniflux
    pulumi config set db_password <YOUR_PASSWORD> --secret
    pulumi config set admin_username admin
    pulumi config set admin_password <YOUR_PASSWORD> --secret
    ```

1. With your configuration values applied, stand up the service:

    ```bash
    pulumi up
    ```

1. In a few minutes, your service will be up and running, with the service URL printed as a Pulumi [stack output](https://www.pulumi.com/docs/intro/concepts/stack/#outputs).

    ```bash
    ...
    Outputs:
        url: "http://lb-f90d03f-5c638bd4535d4c6a.elb.us-west-2.amazonaws.com:8080"
    ```

    Sign in using the administrative user and password you configured above, and start RSSing!

1. When you're ready, destroy your stack and remove it:

    ```bash
    pulumi destroy --yes
    pulumi stack rm --yes
    ```
