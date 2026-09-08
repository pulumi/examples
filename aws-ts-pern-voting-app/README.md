[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-pern-voting-app/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-pern-voting-app/README.md#gh-dark-mode-only)

# PERN stack voting app

A simple voting app that uses React, Express, PostgreSQL, and NodeJS.

The example shows how easy it is to deploy containers into production and to connect them to one another. Since the example defines a custom container, Pulumi does the following:

- Builds the Docker image
- Provisions AWS Container Registry (ECR) instance
- Pushes the image to the ECR instance
- Creates a new ECS task definition, pointing to the ECR image definition

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
1. [Install Docker](https://docs.docker.com/get-docker/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init aws-ts-pern-voting-app
    ```

1.  Set the AWS region and the usernames and passwords for a set of accounts the project uses. The user names must be valid PostgreSQL identifiers, and the passwords must satisfy the RDS master password rules (8-128 printable ASCII characters, excluding `/`, `"`, `@`, and spaces).

    ```bash
    pulumi config set aws:region us-west-2
    pulumi config set sql-admin-name <NAME>
    pulumi config set sql-admin-password <PASSWORD> --secret
    pulumi config set sql-user-name <NAME>
    pulumi config set sql-user-password <PASSWORD> --secret
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Updating (aws-ts-pern-voting-app):
        Type                                          Name                                    Status       Info
    +   pulumi:pulumi:Stack                           voting-app-aws-ts-pern-voting-app          created
    +   ├─ awsx:x:ecs:FargateTaskDefinition           server-side-service                     created
    ...
    +   └─ pulumi-nodejs:dynamic:Resource             postgresql-votes-schema                 created

    Outputs:
        URL: "client-side-listener-086d27d-bb5f264d141c31b7.elb.us-west-2.amazonaws.com"

    Resources:
        + 63 created

    Duration: 4m2s
    ```

1.  View the DNS address of the instance via `pulumi stack output`:

    ```bash
    pulumi stack output
    ```

    ```
    Current stack outputs (1):
        OUTPUT   VALUE
        URL  client-side-listener-086d27d-bb5f264d141c31b7.elb.us-west-2.amazonaws.com
    ```

1.  Verify that the ECS instance exists by connecting to it in a browser window.

## Cleaning up

To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt, then remove the stack:

```bash
pulumi destroy
pulumi stack rm
```
