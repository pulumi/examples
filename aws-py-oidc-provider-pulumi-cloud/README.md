[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-oidc-provider-pulumi-cloud/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-oidc-provider-pulumi-cloud/README.md#gh-dark-mode-only)

# Provisioning an OIDC Provider in AWS for Pulumi Cloud

This example will create OIDC configuration between Pulumi Cloud and AWS, specifically demonstrating connectivity with [Pulumi ESC](https://www.pulumi.com/docs/pulumi-cloud/esc/). The program automates the process detailed in the AWS documentation for the following activities:

- [Obtaining the thumbprint for an OpenID Connect Identity Provider](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html)
- [Creating an OpenID Connect Identity Provider](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)

## Prerequisites

* [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
* [Configure Pulumi to Use AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/) (if your AWS CLI is configured, no further changes are required)
* Install Python 3.x

Make sure to deploy this example in an AWS account that does not already have a provider configured for Pulumi, otherwise the deployment will fail with the following error:

`creating IAM OIDC Provider: EntityAlreadyExists: Provider with url https://api.pulumi.com/oidc already exists.`

## Running the Example

Clone [the examples repo](https://github.com/pulumi/examples) and navigate to the folder for this example.

```bash
git clone https://github.com/pulumi/examples.git
cd examples/aws-py-oidc-provider-pulumi-cloud
```

Next, to deploy the application and its infrastructure, follow these steps:

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init dev
    ```

1. Set your desired AWS region:

    ```bash
    pulumi config set aws:region us-east-1 # any valid AWS region will work
    ```

1. Install requirements.

    ```bash
    python3 -m venv venv
    venv/bin/pip install -r requirements.txt
    ```

1. Run `pulumi up -y`. Once the program completes, it will output a YAML template for you to use in the next step.

## Validating the OIDC Configuration

This next section will walk you through validating your OIDC configuration using [Pulumi ESC](https://www.pulumi.com/docs/pulumi-cloud/esc/).

Start by [creating a new Pulumi ESC environment](https://www.pulumi.com/docs/pulumi-cloud/esc/get-started/#create-an-environment). Then, copy the template definition from the output in the CLI and paste it into your environment. Save your environment file and run the `pulumi env open <your-pulumi-org>/<your-environment>` command in the CLI. You should see output similar to the following:

```bash
$ pulumi env open myOrg/myEnvironment
{
  "aws": {
    "login": {
      "accessKeyId": "ASIA....",
      "secretAccessKey": "rtBS....",
      "sessionToken": "Fwo...."
    }
  },
  "environmentVariables": {
    "AWS_ACCESS_KEY_ID": "ASIA....",
    "AWS_SECRET_ACCESS_KEY": "rtBS....",
    "AWS_SESSION_TOKEN": "Fwo...."
  }
}
```

You can configure more granular access control by adding the `sub` claim to the Provider role's trust policy conditions with the appropriate pattern. In the following example, the role may only be assumed by the specific Pulumi ESC environment that you designate.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::616138583583:oidc-provider/api.pulumi.com/oidc"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "api.pulumi.com/oidc:aud": "<your-pulumi-org>",
                    "api.pulumi.com/oidc:sub": "pulumi:environments:org:<your-pulumi-org>:env:<your-environment-name>"
                }
            }
        }
    ]
}
```
Once you are done, you can destroy all of the resources as well as the stack:

```bash
$ pulumi destroy
$ pulumi stack rm
```
