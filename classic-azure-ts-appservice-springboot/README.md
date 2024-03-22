[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-appservice-springboot/infrastructure/index.ts#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-appservice-springboot/infrastructure/index.ts#gh-dark-mode-only)

# Spring Boot App on Azure App Service Using Jenkins

This example shows how you can deploy a Spring Boot app to an Azure App Service instance using Pulumi in a Jenkins Pipeline. The Spring Boot app is packaged into a container image that is conveniently built as part of the Pulumi app. The container image is pushed up to a private Azure Container Registry and then used as the source for an App Service instance.

## Prerequisites

1.  [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1.  [Configure Azure credentials](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/)

## Steps

### Step 1: Create a new stack

```
$ cd infrastructure
$ pulumi stack init dev
```

### Step 2: Log in to the Azure CLI

You will be prompted to do this during deployment if you forget this step.

```
$ az login
```

### Step 3: Install NPM dependencies

```
$ npm install
```

### Step 4: Deploy your changes

Run `pulumi up` to preview and deploy changes:

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

### Step 5: Check the deployed website endpoint

```
$ pulumi stack output appServiceEndpoint
https://azpulumi-as0ef47193.azurewebsites.net

$ curl "$(pulumi stack output appServiceEndpoint)/greeting"
{"id":1, "content": "Hello, World"}
```
