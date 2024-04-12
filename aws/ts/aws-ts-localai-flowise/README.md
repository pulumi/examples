# Example Code to deploy LocalAI, Flowise, and Pulumi on AWS EKS

## Prerequisites

- [Pulumi CLI](https://www.pulumi.com/docs/install/)
- [Node.js](https://nodejs.org/en/download/)
- [AWS Account](https://aws.amazon.com)

## How to deploy?

> If you run Pulumi for the first time, you will be asked to log in. Follow the instructions on the screen to
> login. You may need to create an account first, don't worry it is free.

### Step 1 - Clone the repository

```shell
git clone https://github.com/pulumi/examples.git
cd examples/aws-ts-localai-flowise
```

### Step 2 - Install the dependencies

```shell
pulumi install
```

### Step 3 - Login to AWS

```shell
aws configure
```

### Step 4 - Deploy the infrastructure

```shell
pulumi up
```

### Step 5 - Port forward the Flowise UI

To retrieve the kubeconfig file, you can use the following command:

```shell
pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml
```

As the program does not deploy a LoadBalancer, you need to port forward the UI to your local machine:

```shell
kubectl port-forward svc/flowise-ui 3000:3000
```
