# GCP Functions

An example Pulumi component that deploys a TypeScript function to Google Cloud Functions.

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init gcp-fn
    ```

1.  Configure GCP project and region:

    ```
    $ pulumi config set gcp:project <projectname> 
    $ pulumi config set gcp:region <region>
    ```

1.  Restore NPM dependencies:

    ```
    $ npm install
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ``` 
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    info: 6 changes performed:
        + 6 resources created
    Update duration: 39.65130324s
    ```

1.  Check the deployed function endpoint:

    ```
    $ pulumi stack output url
    https://us-central1-pulumi-development.cloudfunctions.net/greeting-function-7f95447
    $ curl "$(pulumi stack output url)"
    Greetings from Google Cloud Functions!
    ...
    ```
