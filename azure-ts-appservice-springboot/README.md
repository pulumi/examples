[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/tree/master/azure-ts-appservice-springboot/infrastructure)

# Deploy a Spring Boot App using Jenkins and Pulumi

This example shows how you can deploy a Spring Boot app to an Azure App Service instance using Pulumi in a Jenkins Pipeline. The Spring Boot app is packaged into a container image that is automatically (and conveniently!) built as part of the Pulumi app. The container image is pushed up to a private Azure Container Registry and then used as the source for an App Service instance.

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

1.  Restore NPM dependencies:

    ```
    $ cd infrastructure
    $ npm install
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ``` 
    $ pulumi up
    Previewing changes:
    +  pulumi:pulumi:Stack jenkins-tutorial-dev create 
    +  docker:image:Image spring-boot-greeting-app create 
    +  azure:core:ResourceGroup jenkins-tutorial-group create 
    +  azure:containerservice:Registry myacr create 
    +  azure:appservice:Plan appservice-plan create 
    +  azure:appservice:AppService spring-boot-greeting-app create 
    +  pulumi:pulumi:Stack jenkins-tutorial-dev create 

    ...
    ```

1.  Check the deployed website endpoint:

    ```
    $ pulumi stack output appServiceEndpoint
    https://azpulumi-as0ef47193.azurewebsites.net

    $ curl "$(pulumi stack output appServiceEndpoint)/greeting"
    {"id":1, "content": "Hello, World"}
    ```

