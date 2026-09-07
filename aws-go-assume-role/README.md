# AWS resources using AssumeRole

This example shows how to use the AssumeRole functionality of the AWS provider to create resources in the security context of an IAM Role assumed by the IAM User running the Pulumi programs.

This directory contains two Pulumi projects that are deployed in sequence:

- [create-role/](./create-role) — creates an unprivileged IAM user and a role the user is allowed to assume.
- [assume-role/](./assume-role) — assumes that role and creates an S3 bucket in its security context.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Go](https://www.pulumi.com/docs/intro/languages/go/)

## Deploying the example

### Part 1: privileged components

The Pulumi program in `create-role` requires credentials with permissions to create an IAM User, an IAM Role, and assign
an AWS Access Key to the user. The program creates a new, unprivileged user with no policies attached, and a role which
specifies a trust policy allowing assumption by the unprivileged user. The role allows the `s3:*` actions on all
resources.

Set the `unprivilegedUsername` configuration variable to the name of the unprivileged user, as
well as the AWS region in which to operate, then deploy the stack:

```bash
cd create-role
go mod download
pulumi stack init assume-role-create
pulumi config set unprivilegedUsername somebody@pulumi.com
pulumi config set aws:region us-east-1
pulumi up
```

The outputs of the program tell you the ARN of the Role, and the Access
Key ID and Secret associated with the User:

```bash
pulumi stack output --json
```

```
{
    "accessKeyId": "AKIAY65FYVYP2MBSRQZK",
    "roleArn": "arn:aws:iam::616138583583:role/allow-s3-management-2c45483",
    "secretAccessKey": "[secret]"
}
```

The above command does not show the `secretAccessKey`. In order to show the secret value, use this:

```bash
pulumi stack output --json --show-secrets
```

```
{
  "accessKeyId": "AKIAYJ7EUPHL3DSDH4CX",
  "roleArn": "arn:aws:iam::571173272023:role/allow-s3-management-fcc71c0",
  "secretAccessKey": "[plain text value]"
}
```

### Part 2: assuming the role

The Pulumi program in `assume-role` creates an S3 bucket after assuming the Role created in Part 1. It should be run
with the unprivileged user credentials created in Part 1. Configure it as follows, from the `assume-role`
directory, replacing `{YOUR_STACK_PATH/assume-role-create}` with the full name of your stack from Part 1. The full name
of your stack is available at [`app.pulumi.com`][app]:

```bash
cd assume-role
go mod download
export AWS_ACCESS_KEY_ID="$(pulumi stack output --stack {YOUR_STACK_PATH/assume-role-create} accessKeyId)"
export AWS_SECRET_ACCESS_KEY="$(pulumi stack output --stack {YOUR_STACK_PATH/assume-role-create} --show-secrets secretAccessKey)"
```

The configuration variable `roleToAssumeARN` must be set to the ARN of the role allowing S3 access, and the AWS region
must be set to the region in which you wish to operate:

```bash
pulumi stack init assume-role-assume
pulumi config set roleToAssumeARN "$(pulumi stack output --stack {YOUR_STACK_PATH/assume-role-create} roleArn)"
pulumi config set aws:region us-east-1
```

Unset the `AWS_SESSION_TOKEN` or any additional credential setting if you have set it for previous access:

```bash
unset AWS_SESSION_TOKEN
```

Deploy the stack:

```bash
pulumi up
```

You can verify that the role is indeed assumed by looking at the
CloudTrail logs of the bucket creation operation, or by commenting out the `assumeRole` configuration in the provider
and ensuring creation is not successful.

## Cleaning up

To clean up your resources, run `pulumi destroy` and respond yes to the
confirmation prompt in each project directory.

[app]: https://app.pulumi.com/
