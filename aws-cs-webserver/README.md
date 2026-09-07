[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-cs-webserver/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-cs-webserver/README.md#gh-dark-mode-only)

# Web server using Amazon EC2

An example based on the Amazon sample at:
http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/deploying.applications.html. The example deploys an EC2 instance and opens port 80.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-west-2
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

1.  View the host name and IP address of the instance via `stack output`:

    ```bash
    pulumi stack output
    ```

    ```
    Current stack outputs (2):
        OUTPUT          VALUE
        PublicDns       ec2-34-217-176-141.us-west-2.compute.amazonaws.com
        PublicIp        34.217.176.141
    ```

1.  Verify that the EC2 instance exists, by either using the AWS Console or running `aws ec2 describe-instances`.

    From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your stack.

## Cleaning up

Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

```bash
pulumi destroy
pulumi stack rm
```
