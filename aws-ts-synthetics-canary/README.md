[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Deploy AWS Synthetics Canary Using a Local Script

An example of deploying an [AWS Synthetics Canary](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html) using a script stored locally.

This example does the following:
1. Zips up a colocated canary script.
1. Pushes the zip file to an S3 bucket.
1. Creates an IAM role and policy for the canary.
1. Deploys the canary.

The canary used in this example is a simple no-op script that writes a message.
See [Writing Canary Scripts](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_WritingCanary.html) for details regarding canary directory structure and naming conventions.
There are some prebaked canary scripts for doing things like checking an API or a link that can be found on AWS. 

## Deploying and running the program

1.  Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1.  Set the AWS region:

    ```
    $ pulumi config set aws:region us-east-1
    ```

1.  Restore NPM modules via `npm install` or `yarn install`.

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    
    ```

## Clean up

1.  Run `pulumi destroy` to tear down all resources.

1.  To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi Console.