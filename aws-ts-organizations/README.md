# AWS Organizations
[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-organizations/README.md)

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)


**Note**: This app requires credentials that have permissions to
AWS Organizations service. The IAM user running this app should
also be granted permissions to assume the role identified by `OrganizationalAccountAccessRole` in any account.

## Deploying and running the program

Note that unlike other resources that can be created/destroyed easily,
this app creates an AWS account. Read the blog post about [organizing AWS accounts with Pulumi](https://www.pulumi.com/blog/organizing-aws-accounts-with-pulumi) to learn more.

1. Create a new stack:

    ```bash
    $ pulumi stack init aws-ts-organizations
    ```

1. Set the AWS region and the email contact to use for the dev AWS account that this app creates:

    ```bash
    $ pulumi config set aws:region us-west-2
    $ pulumi config set devAccountEmailContact <email> --secret
    ```

1. Restore NPM modules via `npm install` or `yarn install`.

1. Run `pulumi up -y` to deploy changes.

Note that the flag to automatically close an account when the
associated resource is destroyed in Pulumi is set to `false`,
so the account won't be closed automatically. You can, of course,
change that flag in the code to `true` but that decision left
to you.
