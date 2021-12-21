[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-docker-gcr-cloudrun/README.md)

# Docker Build and Push to GCR and Deploy to Google Cloud Run using separate projects

An example of building a custom Docker image and pushing it into a Google Cloud Container Registry and then in a separate project deploying that image with the Google Cloud Run service using TypeScript.

> Note this is an adaptation of the [gcp-ts-cloudrun example](../gcp-ts-cloudrun)

## Prerequisites

1. [Ensure you have the latest Node.js and NPM](https://nodejs.org/en/download/)
2. [Install the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
3. [Configure Pulumi to access your GCP account](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
4. [Install Docker](https://docs.docker.com/install/)
5. Enable Docker to deploy to Google Container Registry with `gcloud auth configure-docker`
6. [Setup Docker auth with a JSON key to get image from GCR](https://cloud.google.com/container-registry/docs/advanced-authentication#json-key)

## Build and Push Docker Image

1.  Navigate to the `docker-build-push-gcr` directory

2. Restore NPM dependencies:

    ```
    $ npm install
    ```

3.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

4.  Configure your GCP project and region:

    ```
    $ pulumi config set gcp:project <projectname> 
    $ pulumi config set gcp:region <region>
    ```

5.  Run `pulumi up` to preview and deploy changes:

    ``` 
    $ pulumi up
    Previewing update (dev):
    ...

    Updating (dev):
        Type                   Name                 Status      
    +   pulumi:pulumi:Stack    gcr-build-image-dev  created     
    +   └─ docker:image:Image  ruby-app             created     
    
    Outputs:
        digest: "gcr.io/velvety-rock-274215/ruby-app:latest-fee86d3d35fccf2ad4d86bbfcdd489acf7b1e4db0ebb8166378bd1fb0ca9cee6"

    Resources:
        + 2 created

    Duration: 16s
    ```


## Deploy Cloud Run 

1. Navigate to the `cloud-run-deploy` directory


2. Restore NPM dependencies:

    ```
    $ npm install
    ```

3.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

4.  Configure your GCP project, region and docker config file:

    ```
    $ pulumi config set gcp:project <projectname> 
    $ pulumi config set gcp:region <region>
    $ pulumi config set docker-config-file <location of ~/.docker/config.json>
    ```

5.  Run `pulumi up` to preview and deploy changes:

    ``` 
    $ pulumi up
    Previewing update (dev):
        Type                         Name                   Plan       
    +   pulumi:pulumi:Stack          cloud-run-deploy-dev   create     
    +   ├─ pulumi:providers:docker   gcr                    create     
    +   ├─ docker:index:RemoteImage  ruby-app-docker-image  create     
    +   ├─ gcp:cloudrun:Service      ruby                   create     
    +   └─ gcp:cloudrun:IamMember    ruby-everyone          create     
    
    Resources:
        + 5 to create

    Do you want to perform this update? yes
    Updating (dev):
        Type                         Name                   Status      
    +   pulumi:pulumi:Stack          cloud-run-deploy-dev   created     
    +   ├─ pulumi:providers:docker   gcr                    created     
    +   ├─ docker:index:RemoteImage  ruby-app-docker-image  created     
    +   ├─ gcp:cloudrun:Service      ruby                   created     
    +   └─ gcp:cloudrun:IamMember    ruby-everyone          created     
    
    Outputs:
        rubyUrl: "https://ruby-app-7a54c5f5e006d5cf33c2-zgms4nzdba-uc.a.run.app"

    Resources:
        + 5 created

    Duration: 23s
    ```

5.  Check the deployed Cloud Run endpoint:

    ```
    $ curl "$(pulumi stack output rubyUrl)"
    Hello Pulumi!
    ```

6. Clean up your GCP and Pulumi resources (run in both projects):

    ```
    $ pulumi destroy
    ...
    $ pulumi stack rm dev
    ...
    ```
