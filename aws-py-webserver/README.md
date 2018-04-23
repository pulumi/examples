# AWS web server example in Python

An example based on the basic Amazon EC2 Instance sample at:
http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/deploying.applications.html. The example deploys an EC2 instance and opens port 80. To get the correct Amazon Linux AMI for the instance size and region, a mapping is defined in [ami.py](./ami.py).

## Prerequisites

1. [Install Pulumi](https://docs.pulumi.com/install/)
1. [Configure Pulumi for AWS](https://docs.pulumi.com/install/aws-config.html)
1. [Configure Pulumi for Python](https://docs.pulumi.com/reference/python.html)

## Deploying and running the program

1.  Login to the Pulumi CLI via `pulumi login`.

1.  Initialize a Pulumi repository with pulumi init, using your GitHub username. (Note: this step will be removed in the future.)

    ```bash
    $ pulumi init --owner githubUsername
    ```

1.  Create a new stack:

    ```
    $ pulumi stack init webserver-testing
    Created stack 'webserver-testing'.
    ```

1.  Run `pulumi preview`:

    ```
    $ pulumi preview
    Previewing stack 'python-test' in the Pulumi Cloud ☁️
    Previewing changes:

    pulumi:Stack("webserver-py-python-test"): Completed 
    aws:SecurityGroup("web-secgrp"):          + Would create 
    aws:Instance("web-server-www"):           + Would create 
    info: 3 changes previewed:
        + 3 resources to create
    ```

1.  Run `pulumi update`:

    ```
    $ pulumi update
    Updating stack 'python-test' in the Pulumi Cloud ☁️
    Performing changes:

    pulumi:Stack("webserver-py-python-test"): Completed 
    aws:SecurityGroup("web-secgrp"):          + Created 
    aws:Instance("web-server-www"):           + Created 
    info: 3 changes performed:
        + 3 resources created
    Update duration: 26.445180782s
    ```

1.  Verify that the EC2 instance exists, by either using the AWS Console or running `aws ec2 describe-instances`.

1.  Clean up resources by running `pulumi destroy`.

    
