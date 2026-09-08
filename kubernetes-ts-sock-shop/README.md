[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-ts-sock-shop/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-ts-sock-shop/README.md#gh-dark-mode-only)

# Sock Shop Pulumi demo

A version of the standard [Sock Shop microservices reference app](https://github.com/microservices-demo/microservices-demo) app using
Pulumi and `@pulumi/kubernetes`.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Tell the application whether you're deploying to minikube:

    ```bash
    pulumi config set isMinikube <value>
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Updating stack 'testing'
    Performing changes:

         Type                        Name          Status      Info
     +   kubernetes:core:Service     carts-db      created
     +   kubernetes:core:Service     carts         created
     +   kubernetes:core:Service     catalog-db    created
     +   kubernetes:core:Service     catalog       created
     +   kubernetes:core:Service     orders-db     created
     +   kubernetes:core:Service     orders        created
     +   kubernetes:core:Service     payment       created
     +   kubernetes:core:Service     rabbitmq      created
     +   kubernetes:core:Service     shipping      created
     +   kubernetes:core:Service     user-db       created
     +   kubernetes:core:Service     user          created
     +   kubernetes:core:Service     front-end     created
     +   kubernetes:core:Service     queue-master  created
     +   kubernetes:apps:Deployment  queue-master  created
     +   kubernetes:apps:Deployment  catalog-db    created
     +   kubernetes:apps:Deployment  catalog       created
     +   kubernetes:apps:Deployment  payment       created
     +   kubernetes:apps:Deployment  rabbitmq      created
     +   kubernetes:apps:Deployment  front-end     created
     +   kubernetes:apps:Deployment  carts-db      created
     +   kubernetes:apps:Deployment  orders-db     created
     +   kubernetes:apps:Deployment  user-db       created
     +   kubernetes:apps:Deployment  user          created
     +   kubernetes:apps:Deployment  carts         created
     +   kubernetes:apps:Deployment  orders        created
     +   kubernetes:apps:Deployment  shipping      created

    info: 27 changes performed:
        + 27 resources created
    Update duration: 3m2.127835854s
    ```

1.  The application is now deployed. Use `kubectl` to see the deployed services:

    ```bash
    kubectl get services -n sock-shop
    ```

    ```
    NAME           CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
    carts          10.47.242.164   <none>        80/TCP         4m
    carts-db       10.47.245.60    <none>        27017/TCP      4m
    catalogue      10.47.255.170   <none>        80/TCP         4m
    catalogue-db   10.47.252.96    <none>        3306/TCP       4m
    front-end      10.47.247.63    <nodes>       80:30001/TCP   4m
    orders         10.47.255.197   <none>        80/TCP         4m
    orders-db      10.47.242.209   <none>        27017/TCP      4m
    payment        10.47.254.192   <none>        80/TCP         4m
    queue-master   10.47.251.206   <none>        80/TCP         4m
    rabbitmq       10.47.254.26    <none>        5672/TCP       4m
    shipping       10.47.247.218   <none>        80/TCP         4m
    user-db        10.47.242.91    <none>        27017/TCP      4m
    user           10.47.242.91    <none>        27017/TCP      4m
    ```

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
