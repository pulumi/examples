[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-java-function-graal-spring/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-java-function-graal-spring/README.md#gh-dark-mode-only)

# Azure Function with Spring Boot Native and GraalVM

Starting point for building Spring Native application hosted in Azure Function.

Inspired by [Julien Dubois](https://github.com/jdubois/azure-native-spring-function)
and [Spring Native - Cloud Function Netty example](https://github.com/spring-projects-experimental/spring-native/tree/main/samples/cloud-function-netty).

Azure Functions custom handlers are used to run the GraalVM binary.

## Running the App in Azure

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

1. Set the Azure region location:

    ```
    $ pulumi config set azure-native:location westus
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    Resources:
        + X created
    Duration: ...
    ```

1.  Check the deployed website endpoint:

    ```
    $ pulumi stack output endpoint
    https://<identifier>.web.core.windows.net/api/hello
    $ curl "$(pulumi stack output endpoint)"
    {"message":"Hello from Spring, Pulumi!"}
    ```

## Running the App locally

1. Run Spring Boot application and send a request:

    ```
    gradle bootRun
    curl localhost:8080
    ```
