# GCP OIDC Pulumi program in TypeScript

This Pulumi program enables [Pulumi Cloud](https://app.pulumi.com) to authenticate with an OIDC provider in a Google Cloud project, and creates a Pulumi ESC environment that allows both the [`gcloud` CLI](https://cloud.google.com/sdk/gcloud) and the [Pulumi Google Cloud provider](https://www.pulumi.com/registry/packages/gcp/) to consume temporary (admin) credentials.

Last update: September 2025

## 📋 Pre-requisites

- Create a Google Cloud project
- [Configure Pulumi to Use Google Cloud](https://www.pulumi.com/docs/iac/get-started/gcp/begin/)
- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- [Pulumi Cloud account](https://app.pulumi.com/signup)
- [npm](https://www.npmjs.com/get-npm)

## 👩‍🏫 Get started

This Pulumi example is written as a template. It is meant to be copied via `pulumi new`

```bash
# login to your Pulumi Cloud if you haven't already
pulumi login

# pick a name for your output directory (--dir is optional. will use current directory if omitted)
my_dir=my-gcp-oidc
pulumi new https://github.com/pulumi/examples/gcp-ts-oidc-provider-pulumi-cloud --dir ${my_dir}
cd ${my_dir}
```

Once copied to your machine, feel free to edit as needed.

## 🎬 How to run

This template will pick up the thumbprint from the URL that you set in the stack configuration. By default it will use the OIDC IDP URL for Pulumi Cloud.

To deploy your infrastructure, run:

```bash
$ pulumi up
# select 'yes' to confirm the expected changes
# 🎉 Ta-Da!
```

Note: due to propagation delays, the OIDC connection may take a few minutes before it is usable.

## 🧹 Clean up

To clean up your infrastructure, run:

```bash
$ pulumi destroy
# select 'yes' to confirm the expected changes
```

# Additional notes

This project is generally useful as a baseline setup for using ESC with Google Cloud. You may want to refine the scope of the accounts permissions (e.g. from `roles/admin` to `roles/writer` or `roles/reader`), or you may want to [import](https://www.pulumi.com/docs/esc/get-started/import-environments/) the generated ESC environment into a new ESC environment to enable scenarios like [accessing Google Secret Manager secrets](https://www.pulumi.com/docs/esc/integrations/dynamic-secrets/gcp-secrets/).
