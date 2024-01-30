[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-cloudrun/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-cloudrun/README.md#gh-dark-mode-only)

# Google Cloud Run

An example of deploying a custom Docker image into Google Cloud Run service using TypeScript. Our image builds a simple HelloWorld web application in Ruby. You may change it to any language and runtime that can run on Linux and serve HTTP traffic.

## Prerequisites

1. [Ensure you have the latest Node.js and NPM](https://nodejs.org/en/download/)
2. [Install the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
3. [Configure Pulumi to access your GCP account](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
4. [Install Docker](https://docs.docker.com/install/)
5. Enable Docker to deploy to Google Container Registry with `gcloud auth configure-docker`

## Running the App

1.  Restore NPM dependencies:

    ```
    $ npm install
    ```

2.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

3.  Configure your GCP project and region:

    ```
    $ pulumi config set gcp:project <projectname>
    $ pulumi config set gcp:region <region>
    ```

4.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing update (dev):
    ...

    Updating (dev):
        Type                       Name              Status
    +   pulumi:pulumi:Stack        gcp-cloudrun-dev  created
    +   ├─ docker:image:Image      ruby-app          created
    +   ├─ gcp:projects:Service    EnableCloudRun    created
    +   ├─ gcp:cloudrun:Service    hello             created
    +   ├─ gcp:cloudrun:Service    ruby              created
    +   ├─ gcp:cloudrun:IamMember  hello-everyone    created
    +   └─ gcp:cloudrun:IamMember  ruby-everyone     created

    Outputs:
        helloUrl: "https://hello-a28eea2-q1wszdxb2b-ew.a.run.app"
        rubyUrl : "https://ruby-420a973-q1wszdxb2b-ew.a.run.app"

    Resources:
        + 7 created

    Duration: 3m37s
    ```

5.  Check the deployed Cloud Run endpoint:

    ```
    $ curl "$(pulumi stack output rubyUrl)"
    Hello Pulumi!
    ```

6. Clean up your GCP and Pulumi resources:

    ```
    $ pulumi destroy
    ...
    $ pulumi stack rm dev
    ...
    ```
