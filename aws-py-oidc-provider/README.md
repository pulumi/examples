## Provisioning an OIDC Provider in AWS for Pulumi ESC

WIP

Install requirements.

```bash
pip3 install -r requirements.txt
```

Provide the name of your Pulumi Organization in Python file.

Run `pulumi up -y`.

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
