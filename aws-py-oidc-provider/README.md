## Provisioning an OIDC Provider in AWS for Pulumi

WIP - This folder probably needs a better name to reflect that this example is configuring OIDC connection between Pulumi and AWS.

Install requirements.

```bash
pip3 install -r requirements.txt
```

Provide the name of your Pulumi Organization to the `audience` variable in the `__main__.py` file.

```bash
# Variable in the python program
audience = "" # Provide the name of your Pulumi Organization
```

Save file and run `pulumi up -y`.

Copy Role Arn and put into `aws login` section of Environment file.

```
values:
  aws:
    login:
      fn::open::aws-login:
        oidc:
          duration: 1h
          roleArn: <your-oidc-role-arn>
          sessionName: pulumi-environments-session
```

Run `pulumi env open <your-pulumi-org>/<your-environment>` to validate.

You can configure more granular access control by adding the `sub` claim to the trust policy’s conditions with an appropriate pattern. In the following example, the role may only be assumed by the specific Pulumi ESC environment that you designate.

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
