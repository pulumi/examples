[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-organizations/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-organizations/README.md#gh-dark-mode-only)

# AWS Organizations

[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-organizations/README.md)

This example shows you how you can automate the creation of member accounts in AWS Organizations with Pulumi. This example is written in TypeScript, however, the concepts used within can be used with any of the supported SDKs in Pulumi. Read the associated [blog post](https://www.pulumi.com/blog/organizing-aws-accounts-with-pulumi) to learn more.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)

### Enable policy types

This example also creates sample backup policy and tag policy at the organization unit-level.
You should first enable those policy types for your management account by navigating to the
AWS Organizations service > Policies, then click **Backup policies** as well as **Tag policies**
and enable them.

**Note**: This app requires credentials that have permissions to
AWS Organizations service. The IAM user running this app should
also be granted permissions to assume the role identified by `OrganizationalAccountAccessRole` in any account.

## Deploying and running the program

Note that unlike other resources that can be created/destroyed easily,
this app creates an AWS account and closed accounts are in a suspended state
for 90 days. That means, you won't be able to delete the organizational until until
the 90 days has elapsed.

1. Create a new stack:

    ```bash
    $ pulumi stack init accounts
    ```

1. Set the AWS region and the email contact to use for the dev AWS account that this app creates:

> The email contact for each member account needs to be unique. You can take advantage of email aliases
> that some email services provide by using the `+` character. Check with your email provider to see
> how if you can use email aliases.

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

## Destroying the stack

Before you can destroy all the resoruces deployed by this stack with
a `pulumi destroy`, there are a couple of things to note.

1. The single AWS account that this example creates is protected from deletion
   by using Pulumi's `protect` resource option. That means, you should first tell
   Pulumi to release the protection. See the [docs](https://www.pulumi.com/docs/intro/concepts/resources/options/protect/)
   to learn how you can do that quickly.
1. As mentioned before, closed accounts will enter into in a suspended state for 90 days.
   That means you will encounter an error about not being able to delete the organizational
   unit (OU) despite having closed the AWS account that was under it. You will need to wait for 90 days
   before you can delete the OU.
