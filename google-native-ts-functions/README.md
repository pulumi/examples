[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/google-native-ts-functions/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/google-native-ts-functions/README.md#gh-dark-mode-only)

# Google Cloud Functions

An example of deploying an HTTP Google Cloud Function endpoint using Google Cloud Native provider and TypeScript.

## Prerequisites

0. [Ensure you have the latest Node.js and NPM](https://nodejs.org/en/download/)
2. [Install the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
3. [Configure Pulumi to access your Google Cloud account](https://www.pulumi.com/docs/intro/cloud-providers/google/setup/)

## Running the App

1.  Restore NPM dependencies:

    ```
    $ npm install
    ```

2.  Create a new stack:

    ```
    $ pulumi stack init google-fn
    ```

3.  Configure your Google Cloud project and region:

    ```
    $ pulumi config set google-native:project <projectname>
    $ pulumi config set google-native:region <region>
    ```

4.  Run `pulumi up` to preview and deploy changes:

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

5.  Check the deployed function endpoint:

    ```
    $ pulumi stack output url
    https://us-central1-pulumi-development.cloudfunctions.net/greeting-function-7f95447
    $ curl "$(pulumi stack output functionUrl)"
    Greetings from Google Cloud Functions!
    ```

6. Clean up your Google Cloud and Pulumi resources:

    ```
    $ pulumi destroy
    ...
    $ pulumi stack rm
    ...
    ```
