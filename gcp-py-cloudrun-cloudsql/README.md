[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Deploy Cloud Run instance connected to Cloud SQL

Example of starting a Cloud Run deployment with Cloud SQL instance

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Configure the project:

    ```
    $ pulumi config set gcp:project YOURGOOGLECLOUDPROJECT
    $ pulumi config set gcp:region europe-west1
    $ pulumi config set db-name project-db
    $ pulumi config set --secret db-password SuuperSecret12345!
    ```

1.  Preview and deploy changes:
    ``` 
    $ pulumi up
    ```

1.  Curl the Cloud Run:

    ```
    $ curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" $(pulumi stack output cloud_run_url)
    ```

1.  Access the database:

    ```
    $ gcloud sql connect $(pulumi stack output cloud_sql_instance_name) -u $(pulumi config get db-name) --project $(pulumi config get gcp:project)
    ```

1. Cleanup

    ```
    $ pulumi destroy
    $ pulumi stack rm
    ```
