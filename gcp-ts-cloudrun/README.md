[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-cloudrun/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-cloudrun/README.md#gh-dark-mode-only)

# Google Cloud Run

An example of deploying a custom Docker image into Google Cloud Run service using TypeScript. Our image builds a simple HelloWorld web application in Ruby. You may change it to any language and runtime that can run on Linux and serve HTTP traffic.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
4. [Install Docker](https://docs.docker.com/get-docker/)
5. Enable Docker to deploy to Google Container Registry with `gcloud auth configure-docker`

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

2.  Configure your GCP project and region:

    ```bash
    pulumi config set gcp:project <projectname>
    pulumi config set gcp:region <region>
    ```

3.  Install dependencies:

    ```bash
    npm install
    ```

4.  Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
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

    ```bash
    curl "$(pulumi stack output rubyUrl)"
    ```

    ```
    Hello Pulumi!
    ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
