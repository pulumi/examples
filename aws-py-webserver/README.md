[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-webserver/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-webserver/README.md#gh-dark-mode-only)

# Web server using Amazon EC2

An example based on the Amazon sample at
http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/deploying.applications.html. The example deploys an EC2 instance and opens port 80.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init python-webserver-testing
    ```

1. Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-west-2
    ```

1. Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```bash
    pulumi up
    ```

    ```
    Previewing stack 'python-webserver-testing'
    Previewing changes:
    ...

    Do you want to proceed? yes
    Updating stack 'python-webserver-testing'
    Performing changes:

    #: Resource Type          Name                                   Status     Extra Info
    1: pulumi:pulumi:Stack    webserver-py-python-webserver-testing  + created
    2: aws:ec2:SecurityGroup  web-secgrp                             + created
    3: aws:ec2:Instance       web-server-www                         + created

    info: 3 changes performed:
        + 3 resources created
    Update duration: 26.470339302s
    ```

1. View the host name and IP address of the instance via `stack output`:

    ```bash
    pulumi stack output
    ```

    ```
    Current stack outputs (2):
        OUTPUT                                           VALUE
        public_dns                                       ec2-34-217-176-141.us-west-2.compute.amazonaws.com
        public_ip                                        34.217.176.141
    ```

1. Verify that the EC2 instance exists, by either using the AWS Console or running `aws ec2 describe-instances`.

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
