# Setting up secrets providers for Pulumi

Pulumi supports [secrets providers](https://www.pulumi.com/docs/intro/concepts/config/#configuring-secrets-encryption) which allow you to encrypt the secrets you store in the Pulumi statefile.

This example shows how to set up the secrets provider for each cloud and walks through initializing your stack using the different secrets providers.

This directory contains one deployable Pulumi project per secrets provider:

- [aws/](./aws) — encrypt secrets with AWS KMS.
- [azure/](./azure) — encrypt secrets with Azure Key Vault.
- [gcloud/](./gcloud) — encrypt secrets with Google Cloud KMS.
- [vault/](./vault) — encrypt secrets with HashiCorp Vault.
