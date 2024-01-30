[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-cs-webserver/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-cs-webserver/README.md#gh-dark-mode-only)

# Web Server Using Amazon EC2

An example based on the Amazon sample at:
http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/deploying.applications.html. The example deploys an EC2 instance and opens port 80.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Install .NET Core 3.0+](https://dotnet.microsoft.com/download)

## Deploying and running the program

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Set the AWS region:

    ```
    $ pulumi config set aws:region us-west-2
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    info: 10 changes performed:
        + 10 resources created
    Update duration: 26.470339302s
    ```

1.  View the host name and IP address of the instance via `stack output`:

    ```
    $ pulumi stack output
    Current stack outputs (2):
        OUTPUT          VALUE
        PublicDns       ec2-34-217-176-141.us-west-2.compute.amazonaws.com
        PublicIp        34.217.176.141
    ```

1.  Verify that the EC2 instance exists, by either using the AWS Console or running `aws ec2 describe-instances`.

1. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

1. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
