# gcp-ts-oidc-provider-pulumi-cloud

This Pulumi program enables [Pulumi Cloud](https://app.pulumi.com) to authenticate with an OIDC provider in a Google Cloud project, and creates a Pulumi ESC environment that allows both the [`gcloud` CLI](https://cloud.google.com/sdk/gcloud) and the [Pulumi Google Cloud provider](https://www.pulumi.com/registry/packages/gcp/) to consume temporary (admin) credentials.

This project is generally useful as a baseline setup for using ESC with Google Cloud. You may want to refine the scope of the accounts permissions (e.g. from `roles/admin` to `roles/writer` or `roles/reader`), or you may want to [import](https://www.pulumi.com/docs/esc/get-started/import-environments/) the generated ESC environment into a new ESC environment to enable scenarios like [accessing Google Secret Manager secrets](https://www.pulumi.com/docs/esc/integrations/dynamic-secrets/gcp-secrets/).
