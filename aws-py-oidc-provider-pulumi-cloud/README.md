# Provisioning an OIDC Provider in AWS for Pulumi Cloud

This example will create OIDC configuration between Pulumi Cloud and AWS, specifically demonstrating connectivity with [Pulumi ESC](https://www.pulumi.com/docs/pulumi-cloud/esc/). The program automates the process detailed in the AWS documentation for the following activities:

- [Obtaining the thumbprint for an OpenID Connect Identity Provider](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html)
- [Creating an OpenID Connect Identity Provider](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)

## Prerequisites

* [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
* [Configure Pulumi to Use AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/) (if your AWS CLI is configured, no further changes are required)

## Running the Example

Clone [the examples repo](https://github.com/pulumi/examples/tree/master/aws-py-oidc-provider) and navigate to the folder for this example.

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
    python -m venv venv
    source venv/bin/activate
    pip3 install -r requirements.txt
    deactivate
    ```

1. Run `pulumi up`. 

    ```bash
    $ pulumi up -y
    Updating (dev)
    
         Type                              Name              Status              Info
     +   pulumi:pulumi:Stack               oidc-python-dev   created (4s)        8 messages
     +   ├─ aws:iam:OpenIdConnectProvider  oidcProvider      created (0.78s)     
     +   └─ aws:iam:Role                   oidcProviderRole  created (0.75s)     
    
    Diagnostics:
      pulumi:pulumi:Stack (oidc-python-dev):
        Forming configuration document URL...
        Extracting domain name from jwks_uri...
        Retrieving OpenSSL certificates (this will take some time)...
        Retrieving last OpenSSL certificate...
        Saving certificate to file...
        Retrieving certificate thumbprint...
        Creating OIDC provider...
        Creating Provider IAM role...
        OIDC configuration complete!
        Copy and paste the following template into your Pulumi ESC environment:
        --------
        values:
          aws:
            login:
              fn::open::aws-login:
                oidc:
                  duration: 1h
                  roleArn: arn:aws:iam::219511111111:role/oidcProviderRole-d49faac
                  sessionName: pulumi-environments-session
    
    Resources:
        + 3 created
    ```
## Validating the OIDC Configuration

This next section will walk you through validating your OIDC configuration using [Pulumi ESC](https://www.pulumi.com/docs/pulumi-cloud/esc/).

Start by [creating a new Pulumi ESC environment](https://www.pulumi.com/docs/pulumi-cloud/esc/get-started/#create-an-environment). Then, copy the template definition from the output in the CLI and paste it into your environment. Save your environment file and run the `pulumi env open <your-pulumi-org>/<your-environment>` command in the CLI. You should see output similar to the following:

```bash
$ pulumi env open myOrg/myEnvironment
{
  "aws": {
    "login": {
      "accessKeyId": "ASIA......",
      "secretAccessKey": "PYP.....",
      "sessionToken": "FwoGZ....."
    }
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
