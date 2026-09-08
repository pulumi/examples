[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-py-cloudrun-cloudsql/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-py-cloudrun-cloudsql/README.md#gh-dark-mode-only)

# Deploy Cloud Run instance connected to Cloud SQL

Example of starting a Cloud Run deployment with a Cloud SQL instance.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Configure the project:

    ```bash
    pulumi config set gcp:project YOURGOOGLECLOUDPROJECT
    pulumi config set gcp:region europe-west1
    pulumi config set db-name project-db
    pulumi config set --secret db-password SuuperSecret12345!
    ```

1. Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Preview and deploy changes:

    ```bash
    pulumi up
    ```

1. Curl the Cloud Run service:

    ```bash
    curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" $(pulumi stack output cloud_run_url)
    ```

1. Access the database:

    ```bash
    gcloud sql connect $(pulumi stack output cloud_sql_instance_name) -u $(pulumi config get db-name) --project $(pulumi config get gcp:project)
    ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it:

```bash
pulumi destroy
pulumi stack rm
```
