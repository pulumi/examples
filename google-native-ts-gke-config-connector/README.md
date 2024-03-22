[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/google-native-ts-gke-config-connector/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/google-native-ts-gke-config-connector/README.md#gh-dark-mode-only)

# Google GKE Config Connector

An example of deploying a GKE cluster and Config Connector addon using Google Cloud Native provider and TypeScript.
This example is based on the [upstream installation docs](https://cloud.google.com/config-connector/docs/how-to/install-upgrade-uninstall)

## Prerequisites

0. [Ensure you have the latest Node.js and NPM](https://nodejs.org/en/download/)
1. [Install the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Pulumi to access your Google Cloud account](https://www.pulumi.com/docs/intro/cloud-providers/google/setup/)

## Running the App

1.  Restore NPM dependencies:

    ```
    $ npm install
    ```

2.  Create a new stack:

    ```
    $ pulumi stack init google-gke-cc
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

5. Clean up your Google Cloud and Pulumi resources:

    ```
    $ pulumi destroy
    ...
    $ pulumi stack rm
    ...
    ```

## Caveats

Currently, the following manual steps are required:
1. The Kubernetes provider doesn't natively support patching unmanaged resources, so the update has to be run in three
parts. First, the Google resources including the GKE cluster and IAM policies are created. Next, the existing
CustomResource is imported into Pulumi state, and finally is modified in a subsequent update. Improvements to this
process are tracked in https://github.com/pulumi/pulumi-kubernetes/issues/264
2. IAM Policy isn't deleted when the stack is destroyed, and requires manual cleanup.
