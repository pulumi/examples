[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-webserver/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-webserver/README.md#gh-dark-mode-only)

# Web Server Using Amazon EC2

An example based on the Amazon sample at:
http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/deploying.applications.html. The example deploys an EC2 instance and opens port 80.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Configure Pulumi for Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying and running the program

1. Create a new stack:

    ```bash
    $ pulumi stack init python-webserver-testing
    ```

1. Set the AWS region:

    ```bash
    $ pulumi config set aws:region us-west-2
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```bash
    $ pulumi up
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

    Permalink: https://pulumi.com/lindydonna/examples/webserver-py/python-webserver-testing/updates/1
    ```

1. View the host name and IP address of the instance via `stack output`:

    ```bash
    $ pulumi stack output
    Current stack outputs (2):
        OUTPUT                                           VALUE
        public_dns                                       ec2-34-217-176-141.us-west-2.compute.amazonaws.com
        public_ip                                        34.217.176.141
    ```

1.  Verify that the EC2 instance exists, by either using the AWS Console or running `aws ec2 describe-instances`.

## Clean up

To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
