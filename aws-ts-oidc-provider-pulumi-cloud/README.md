# AWS OIDC Pulumi program in TypeScript

Last update: June 2024

A Pulumi template to:

- Create AWS resources for AWS OIDC (IdP + Role)
- Create a new Pulumi Cloud ESC Environment (optional)

## How-tos

### Get your OIDC thumbprint

```bash
docker run --platform linux/amd64  nullstring/oidc-thumbprint-finder https://api.pulumi.com/oidc
```

### Use this template

```bash
# copy the template
OUTPUT_DIR=test
pulumi new https://github.com/desteves/aws-oidc-typescript/infra --dir ${OUTPUT_DIR}
# complete the prompts, ensure to indicate if you'd like to also create the ESC Environment.

# create the resources
pulumi up --cwd ${OUTPUT_DIR} --yes

# clean up
pulumi destroy --cwd ${OUTPUT_DIR} --yes --remove
```

## Reference Material

Based on the [Python version](https://github.com/pulumi/examples/tree/master/aws-py-oidc-provider-pulumi-cloud#readme) at so follow those instructions!
