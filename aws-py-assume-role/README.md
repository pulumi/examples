# AWS Resources Using AssumeRole

This example shows how to use the AssumeRole functionality of the AWS provider
to create resources in the security context of an IAM Role assumed by the IAM
User running the Pulumi programs.

## Deploying the Example

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Pulumi for AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Configure Pulumi for Python](https://www.pulumi.com/docs/intro/languages/python/)


### Part 1: Privileged Components

The Pulumi program in `create-role` requires credentials with permissions to create an IAM User, an IAM Role, and assign
an AWS Access Key to the user. The program creates a new, unprivileged user with no policies attached, and a role which
specifies a trust policy allowing assumption by the unprivileged user. The role allows the `s3:*` actions on all 
resources.

You'll need to set the `create-role:unprivilegedUsername` configuration variable to the name of the unprivilged user, as
well as the AWS region in which to operate.

First, you need install dependencies. In this example we will install them in
a virtual environment named `venv`.

```bash
$ cd create-role
$ python3 -m venv venv
$ source venv/bin/activate
$ pip install -r requirements.txt
```

Now create a new stack:

```bash
$ pulumi stack init assume-role-create
$ pulumi config set create-role:unprivilegedUsername james+unpriv@mydomain.com
$ pulumi config set aws:region us-east-1
$ pulumi up
```

The program can then be run with `pulumi up`. The outputs of the program tell you the ARN of the Role, and the Access 
Key ID and Secret associated with the User:

```
$ pulumi stack output --json
{
  "accessKeyId": "AKIAYJ7EUPHL3DSDH4CX",
  "roleArn": "arn:aws:iam::571173272023:role/allow-s3-management-fcc71c0",
  "secretAccessKey": <redacted>
}
```

### Part 2: Assuming the Role

The Pulumi program in `assume-role` creates an S3 bucket after assuming the Role created in Part 1. It should be run
with the unprivileged user credentials created in Part 1. This can be configured as follows, from the `assume-role`
directory, replacing `assume-role-create` with the name of your stack from Part 1.

```bash
$ cd assume-role
$ python3 -m venv venv
$ source venv/bin/activate
$ pip install -r requirements.txt
$ export AWS_ACCESS_KEY_ID="$(pulumi stack output --stack assume-role-create accessKeyId)"
$ export AWS_SECRET_ACCESS_KEY="$(pulumi stack output --stack assume-role-create secretAccessKey)"
```

The configuration variable `roleToAssumeARN` must be set to the ARN of the role allowing S3 access, and the AWS region
must be set to the region in which you wish to operate:

```bash
$ pulumi stack init assume-role-assume
$ pulumi config set roleToAssumeARN "$(pulumi stack output --stack assume-role-create roleArn)"
$ pulumi config set aws:region us-east-1
```

The program can then be run with `pulumi up`. You can verify that the role is indeed assumed by looking at the 
CloudTrail logs of the bucket creation operation, or by commenting out the `assumeRole` configuration in the provider
and ensuring creation is not successful.

### Clean up

To clean up your resources, run `pulumi destroy` and respond yes to the
confirmation prompt.
