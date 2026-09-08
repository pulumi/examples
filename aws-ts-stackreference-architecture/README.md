# AWS StackReference architecture

This will deploy a Data VPC and an application VPC that is peered. It will deploy an RDS Instance into the Data VPC and it will
run a sample application in ECS that is fronted with an ALB.

This directory contains three Pulumi projects that must be deployed in the following order so that the
correct data is shared between the layers:

- [networking/](./networking) — the data and application VPCs, peered together.
- [database/](./database) — an RDS instance deployed into the data VPC.
- [application/](./application) — a sample application running in ECS behind an ALB.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

### Networking

1.  Change to the networking project:

    ```bash
    cd networking
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Create a new Pulumi stack named `dev`:

    ```bash
    pulumi stack init dev
    ```

1.  Set the configuration variables for the project:

    ```bash
    pulumi config set aws:region us-west-2
    ```

    If you wish to control the number of availability zones that the VPC will be created within, you can do this by setting:

    ```bash
    pulumi config set azCount 3
    ```

1.  Deploy the networking stack:

    ```bash
    pulumi up
    ```

### Database

1.  Change to the database project:

    ```bash
    cd database
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Create a new Pulumi stack named `dev`:

    ```bash
    pulumi stack init dev
    ```

1.  Set the configuration variables for the project:

    ```bash
    pulumi config set aws:region us-west-2
    pulumi config set dbUsername MyRootUser
    pulumi config set dbPassword --secret MyPassword1234!
    ```

    You need to set a stack reference to the networking stack so that the RDS Instance can be deployed into the correct VPC
    that was created in the networking stack. The stack needs to be in the form `<organization_or_user>/<projectName>/<stackName>`
    e.g. `myUsername/multicloud/dev`:

    ```bash
    pulumi config set networkingStack stack72/networking-layer/dev
    ```

    If you wish to specify an initial database name in the RDS Instance, then you can do so by setting the following:

    ```bash
    pulumi config set dbName myDatbaseName
    ```

1.  Deploy the database stack:

    ```bash
    pulumi up
    ```

### Application

1.  Change to the application project:

    ```bash
    cd application
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Create a new Pulumi stack named `dev`:

    ```bash
    pulumi stack init dev
    ```

1.  Set the configuration variables for the project:

    ```bash
    pulumi config set aws:region us-west-2
    ```

    You need to set a stack reference to the networking stack so that the application can be deployed into the correct VPC
    that was created in the networking stack. The stack needs to be in the form `<organization_or_user>/<projectName>/<stackName>`:

    ```bash
    pulumi config set networkingStack stack72/networking-layer/dev
    ```

    You need to set a stack reference to the database stack so that the Application Instance can get the correct credentials
    and database information for application startup. The stack needs to be in the form `<organization_or_user>/<projectName>/<stackName>`:

    ```bash
    pulumi config set application-layer:databaseStack stack72/database-layer/dev
    ```

1.  Deploy the application stack:

    ```bash
    pulumi up
    ```

You can then take the output `albAddress` and hit it with `curl` or in the browser to see the application running.

## Cleaning up

In each of the `networking`, `database`, and `application` directories, tear down the resources that are part of the
stack and then remove the stack:

```bash
pulumi destroy
pulumi stack rm
```

> **Note:** `pulumi stack rm` deletes all deployment history from the Pulumi Cloud and cannot be undone.
