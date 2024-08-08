# AWS OIDC Pulumi program in TypeScript

A Pulumi template to:

- Create AWS resources for AWS OIDC (IdP + Role)
- Create a new Pulumi Cloud ESC Environment (optional)

Last update: July 2024

## 📋 Pre-requisites

- AWS CLI and an AWS Account configured
- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- [Pulumi Cloud account](https://app.pulumi.com/signup)
- [npm](https://www.npmjs.com/get-npm)

## 👩‍🏫 Get started

This Pulumi example is written as a template. It is meant to be copied via `pulumi new`

```bash
# login to your Pulumi Cloud if you haven't already
pulumi login

# pick a name for your output directory (--dir is optional, omit for pwd)
D=my-aws-oidc
pulumi new https://github.com/pulumi/examples/aws-ts-oidc-provider-pulumi-cloud --dir ${D}
cd ${D}
```

Once copied to your machine, feel free to edit as needed.

## 🎬 How to run

This template will pick up the thumbprint from the URL that you set in the stack configuration. By default it will use the OIDC IDP URL for Pulumi Cloud, unless you set a different one.

To set a different URL you can run the following command:

```bash
pulumi config set oidcIdpUrl {url}
```

(where `{url}` is the URL for the OIDC IDP)

You must also set the name of the environment that you would like to use:

```bash
pulumi config set escEnv {environment-name}
```

(Note that `{environment-name}` must be in the format `{orgname}/environmentname}` where `orgname` can be your individual account name or the the organization that you are adding the environment to)

To deploy your infrastructure, run:

```bash
$ pulumi up
# select 'yes' to confirm the expected changes
# 🎉 Ta-Da!
```

## 🧹 Clean up

To clean up your infrastructure, run:

```bash
$ pulumi destroy
# select 'yes' to confirm the expected changes
```
