[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-java-function-graal-spring/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/azure-java-function-graal-spring/README.md#gh-dark-mode-only)

# Azure Function with Spring Boot Native and GraalVM

Starting point for building Spring Native application hosted in Azure Function.

Inspired by [Julien Dubois](https://github.com/jdubois/azure-native-spring-function)
and [Spring Native - Cloud Function Netty example](https://github.com/spring-projects-experimental/spring-native/tree/main/samples/cloud-function-netty).

Azure Functions custom handlers are used to run the GraalVM binary.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)
3. [Install Java](https://www.pulumi.com/docs/intro/languages/java/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```bash
    az login
    ```

1.  Set the Azure region location:

    ```bash
    pulumi config set azure-native:location westus
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Previewing changes:
    ...

    Performing changes:
    ...
    Resources:
        + X created
    Duration: ...
    ```

1.  Check the deployed website endpoint:

    ```bash
    pulumi stack output endpoint
    curl "$(pulumi stack output endpoint)"
    ```

    ```
    https://<identifier>.web.core.windows.net/api/hello
    {"message":"Hello from Spring, Pulumi!"}
    ```

## Running the app locally

Run the Spring Boot application and send a request:

```bash
gradle bootRun
curl localhost:8080
```

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
