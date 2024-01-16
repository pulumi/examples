# Pulumi Examples

This repository contains examples of using Pulumi to build and deploy cloud applications and infrastructure across major programming languages.

Each example has a two-part prefix, `<cloud>-<language>`, to indicate which `<cloud>` and `<language>` it pertains to. For example, `<cloud>` could be:
 - `aws` for [Amazon Web Services](https://github.com/pulumi/pulumi-aws) 
 - `azure` for [Microsoft Azure](https://github.com/pulumi/pulumi-azure)
 - `gcp` for [Google Cloud Platform](https://github.com/pulumi/pulumi-gcp) 
 - `kubernetes` for [Kubernetes](https://github.com/pulumi/pulumi-kubernetes) 
 - `cloud` for [Pulumi's cross-cloud programming framework](https://github.com/pulumi/pulumi-cloud).

See the [Pulumi documentation](https://www.pulumi.com/docs/) for more details on getting started with Pulumi.

## Checking Out a Single Example

You can checkout only the example(s) you want by using a [sparse checkout](https://git-scm.com/docs/git-sparse-checkout). The following commands show how checkout only the `aws-go-fargate` example. Replace `aws-go-fargate` with your example of interest. 

```bash
$ mkdir examples && cd examples
$ git init
$ git remote add origin -f https://github.com/pulumi/examples/
$ git config core.sparseCheckout true
$ echo "aws-go-fargate" >> .git/info/sparse-checkout ## update this
$ git pull origin master
```

Don't see an example listed? [Try Pulumi AI](https://www.pulumi.com/ai) and use natural-language prompts to generate Pulumi infrastructure-as-code programs in _any_ language.

## Outline

- [AWS](#aws)
    - [TypeScript](#typescript)
    - [JavaScript](#javascript)
    - [Python](#python)
    - [Go](#go)
    - [C#](#c)
    - [F#](#f)
- [Azure](#azure)
    - [TypeScript](#typescript-1)
    - [Python](#python-1)
    - [Go](#go-1)
    - [C#](#c-1)
    - [F#](#f-1)
- [GCP](#gcp)
    - [TypeScript](#typescript-2)
    - [JavaScript](#javascript-1)
    - [Python](#python-2)
    - [Go](#go-2)
    - [C#](#c-2)
- [Kubernetes](#kubernetes)
    - [TypeScript](#typescript-3)
    - [JavaScript](#javascript-2)
    - [Python](#python-3)
    - [Go](#go-3)
    - [C#](#c-3)
- [Openstack](#openstack)
- [Cloud](#cloud)
- [DigitalOcean](#digitalocean)
- [Multicloud](#multicloud)
- [F5](#f5)
- [Twilio](#twilio)
- [Linode](#linode)
- [Testing](#testing)
- [Automation API](https://github.com/pulumi/automation-api-examples)

## AWS

### TypeScript

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[API Gateway](aws-ts-apigateway) | Deploy a simple REST API that counts the number of times a route has been hit.
[API Gateway HTTP API with routes](aws-ts-apigatewayv2-http-api) | Deploy a HTTP API that invokes a Lambda.
[API Gateway HTTP API quickstart](aws-ts-apigatewayv2-http-api-quickcreate) | Deploy a very simple HTTP API that invokes a Lambda.
[API Gateway V1 with EventBridge and Lambda](aws-ts-apigateway-eventbridge) | Deploy a REST API that uses EventBridge to target a Lambda function. Includes API Gateway model validation and custom integration-response mapping.
[API Gateway V2 with EventBridge and Lambda](aws-ts-apigatewayv2-eventbridge) | Deploy an HTTP API that uses EventBridge to target a Lambda function.
[Apigateway - Auth0](aws-ts-apigateway-auth0) | Deploy a simple REST API protected by Auth0.
[AppSync](aws-ts-appsync) | Deploy a basic GraphQL endpoint in AWS AppSync.
[AssumeRole](aws-ts-assume-role) | Use AssumeRole to create resources.
[Containers](aws-ts-containers) | Provision containers on Fargate.
[EKS - Dashboard](aws-ts-eks) | Deploy an EKS Kubernetes cluster with an EBS-backed StorageClass, then the Kubernetes Dashboard into the cluster.
[EKS - Hello World](aws-ts-eks-hello-world) | Deploy an EKS Kubernetes cluster with an EBS-backed StorageClass, then a Kubernetes namespace and nginx deployment into the cluster.
[EKS - Migrate Node Groups](aws-ts-eks-migrate-nodegroups) | Create an EKS cluster and node group to use for workload migration with zero downtime.
[Fargate](aws-ts-hello-fargate) | Build, deploy, and run a Dockerized app using ECS, ECR, and Fargate.
[Lambda Thumbnailer](aws-ts-lambda-thumbnailer) | Create a video thumbnail extractor using serverless functions.
[Miniflux](aws-ts-pulumi-miniflux) | Stand up an RSS Service using Fargate and RDS.
[Pulumi Webhooks](aws-ts-pulumi-webhooks) | Create a Pulumi `cloud.HttpEndpoint` that receives webhook events delivered by Pulumi Cloud, then echos the event to Slack.
[RDS and Airflow](aws-ts-airflow) | Deploy a RDS Postgres instance and containerized Airflow.
[Resources](aws-ts-resources) | Create various resources, including `cloudwatch.Dashboard`, `cloudwatch.EventRule`, `cloudwatch.LogGroup`, and `sqs.Queue`.
[Ruby on Rails](aws-ts-ruby-on-rails) | Create a single EC2 virtual machine instance with a local MySQL database.
[S3 Lambda](aws-ts-s3-lambda-copyzip) | Set up two AWS S3 Buckets and a single Lambda that listens to one and, upon each new object arriving in it, zips it up and copies it to the second bucket.
[Serverless Application](aws-ts-serverless-raw) | Deploy a complete serverless C# application using raw resources from `@pulumi/aws`.
[Serverless Datawarehouse](aws-ts-serverless-datawarehouse) | Deploy a serverless data warehouse.
[Slackbot](aws-ts-slackbot) | Create a simple slackbot that posts a notification to a specific channel any time you're @mentioned anywhere.
[Stack Reference](aws-ts-stackreference) | Create a "team" EC2 Instance with tags set from upstream stacks.
[Static Website](aws-ts-static-website) | Serve a static website using S3, CloudFront, Route53, and Certificate Manager.
[Step Functions](aws-ts-stepfunctions) | Use Step Functions with a Lambda function.
[Thumbnailer](aws-ts-thumbnailer) | Create a video thumbnail extractor using serverless functions and containers.
[Twitter](aws-ts-twitter-athena) | Query Twitter every 2 minutes, store the results in S3, and set up an Athena table and query.
[URL Shortener](aws-ts-url-shortener-cache-http) | Create a serverless URL shortener that uses high-level components.
[Voting App](aws-ts-voting-app) | Create a simple voting app using Redis and Python Flask.
[Web Server](aws-ts-webserver) | Deploy an EC2 Virtual machine using TypeScript to run a Python web server.
[Web Server with Manual Provisioning](aws-ts-ec2-provisioners) | Use Pulumi dynamic providers to accomplish post-provisioning configuration steps.

### JavaScript

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Containers](aws-js-containers) | Provision containers on Fargate.
[S3 Folder Component](aws-js-s3-folder-component) | Serve a static website on S3 from a component.
[S3 Folder](aws-js-s3-folder) | Serve a static website on S3.
[Servless SQS to Slack](aws-js-sqs-slack) | Wire up a serverless AWS Lambda to an AWS SQS queue and post a message to Slack.
[Web Server - Component](aws-js-webserver-component) | Deploy an EC2 instance using a common module for creating an instance.
[Web Server](aws-js-webserver) | Deploy an EC2 Virtual machine running a Python web server.

### Python

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[API Gateway HTTP API quickstart](aws-py-apigatewayv2-http-api-quickcreate) | Deploy a very simple HTTP API that invokes a Lambda.
[API Gateway V2 with EventBridge and Lambda](aws-py-apigatewayv2-eventbridge) | Deploy an HTTP API that uses EventBridge to target a Lambda function.
[AppSync](aws-py-appsync) | Deploy a basic GraphQL endpoint in AWS AppSync.
[AssumeRole](aws-py-assume-role) | Use AssumeRole to create resources.
[Fargate](aws-py-fargate) | Provision a full ECS Fargate cluster running a load-balanced nginx web server.
[Resources](aws-py-resources) | Create various resources, including `cloudwatch.Dashboard`, `cloudwatch.EventRule`, `cloudwatch.LogGroup`, and `sqs.Queue`.
[S3 Folder](aws-py-s3-folder) | Serve a static website on S3.
[Stack Reference](aws-py-stackreference) | Create a "team" EC2 Instance with tags set from upstream stacks.
[Step Functions](aws-py-stepfunctions) | Use Step Functions with a Lambda function.
[Web Server](aws-py-webserver) | Deploy an EC2 instance and open port 80.

### Go

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[AssumeRole](aws-go-assume-role) | Use AssumeRole to create resources.
[Fargate](aws-go-fargate) | Provision a full ECS Fargate cluster running a load-balanced nginx web server.
[Lambda](aws-go-lambda) | Create a lambda that does a simple `ToUpper` on the string input and returns it.
[S3 Folder](aws-go-s3-folder) | Serve a static website on S3.
[Web Server](aws-go-webserver) | Deploy an EC2 Virtual machine running a Python web server.

### C#

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[AssumeRole](aws-cs-assume-role) | Use AssumeRole to create resources.
[Fargate](aws-cs-fargate) | Build, deploy, and run a Dockerized app using ECS, ECR, and Fargate.
[Lambda](aws-cs-lambda) | Create a lambda that does a simple `ToUpper` on the string input and returns it.
[S3 Folder](aws-cs-s3-folder) | Serve a static website on S3.
[Web Server](aws-cs-webserver) | Deploy an EC2 instance and open port 80.

### F#

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Lambda Web Server](aws-fs-lambda-webserver) | Create a web server in AWS lambda using the Giraffe web server.
[S3 Folder](aws-fs-s3-folder) | Serve a static website on S3.

## Azure

### TypeScript

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Azure Container Apps](azure-ts-containerapps) | Run a Docker image on Azure Container Apps.
[Azure Container Instance](azure-ts-aci) | Run Azure Container Instances on Linux.
[Azure Kubernetes Service](azure-ts-aks) | Create an Azure Kubernetes Service (AKS) Cluster.
[Azure App Service](azure-ts-appservice) | Build a web application hosted in App Service and provision Azure SQL Database and Azure Application Insights.
[Azure App Service with Docker](azure-ts-appservice-docker) | Build a web application hosted in App Service from Docker images.
[App Service in Virtual Network](azure-ts-webapp-privateendpoint-vnet-injection) | Deploy two App Services - Front web app with VNet injection and Back web app with a Private Endpoint.
[Azure Cosmos DB and LogicApp](azure-ts-cosmosdb-logicapp) | Define Cosmos DB, API connections, and link them to a logic app.
[Azure Functions](azure-ts-functions) | Deploy a Node.js serverless function to Azure Functions.
[Azure Functions - Many](azure-ts-functions-many) | Deploy several kinds of Azure Functions created from raw deployment packages.
[Azure SDK integration](azure-ts-call-azure-sdk) | Call Azure SDK functions from a Pulumi program.
[Static Website](azure-ts-static-website) | Configure static website hosting in Azure Storage.
[Azure Synapse](azure-ts-synapse) | Starting point for enterprise analytics solutions based on Azure Synapse.
[Web Server](azure-ts-webserver) | Provision a Linux web server in an Azure Virtual Machine.

### Python

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Azure Container Apps](azure-py-containerapps) | Run a Docker image on Azure Container Apps.
[Azure Container Instance](azure-py-aci) | Run Azure Container Instances on Linux.
[Azure Kubernetes Service](azure-py-aks) | Create an Azure Kubernetes Service (AKS) Cluster.
[Azure App Service](azure-py-appservice) | Build a web application hosted in App Service and provision Azure SQL Database and Azure Application Insights.
[Azure App Service with Docker](azure-py-appservice-docker) | Build a web application hosted in App Service from Docker images.
[Azure SDK integration](azure-py-call-azure-sdk) | Call Azure SDK functions from a Pulumi program in Python.
[Azure Cosmos DB and LogicApp](azure-py-cosmosdb-logicapp) | Define Cosmos DB, API connections, and link them to a logic app.
[Minecraft Server](azure-py-minecraft-server) | Deploy an Azure Virtual Machine and provision a Minecraft server.
[Static Website](azure-py-static-website) | Configure static website hosting in Azure Storage.
[Azure Synapse](azure-py-synapse) | Starting point for enterprise analytics solutions based on Azure Synapse.
[Virtual Data Center](azure-py-virtual-data-center) | Deploy Azure Virtual Data Center (VDC) hub-and-spoke network stacks in Azure, complete with ExpressRoute and VPN Gateways, Azure Firewall guarding a DMZ, and Azure Bastion.
[Web Server](azure-py-webserver) | Provision a Linux web server in an Azure Virtual Machine.

### Go

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Azure Container Apps](azure-go-containerapps) | Run a Docker image on Azure Container Apps.
[Azure Container Instance](azure-go-aci) | Run Azure Container Instances on Linux.
[Azure Kubernetes Service](azure-go-aks) | Create an Azure Kubernetes Service (AKS) Cluster.
[Azure App Service with Docker](azure-go-appservice-docker) | Build a web application hosted in App Service from Docker images.
[Static Website](azure-go-static-website) | Configure static website hosting in Azure Storage.
[Azure SDK integration](azure-go-call-azure-sdk) | Call Azure SDK functions from a Pulumi programin Go.

### C#

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
Cluster.
[Azure Container Apps](azure-cs-containerapps) | Run a Docker image on Azure Container Apps.
[Azure Container Instance](azure-cs-aci) | Run Azure Container Instances on Linux.
[Azure Kubernetes Service](azure-cs-aks) | Create an Azure Kubernetes Service (AKS) Cluster.
[AKS web app with .NET 5](azure-cs-net5-aks-webapp) | Create an Azure Kubernetes Service (AKS) cluster and deploy a web app to it using .NET 5 and C# 9.
[AKS + Cosmos DB](azure-cs-aks-cosmos-helm) | A Helm chart deployed to AKS that stores TODOs in an Azure Cosmos DB MongoDB API.
[Azure App Service](azure-cs-appservice) | Build a web application hosted in App Service and provision Azure SQL Database and Azure Application Insights.
[Azure App Service with Docker](azure-cs-appservice-docker) | Build a web application hosted in App Service from Docker images.
[Azure API integration](azure-cs-call-azure-api) | Call additional Azure API endpoints from a Pulumi program.
[Azure Cosmos DB and LogicApp](azure-cs-cosmosdb-logicapp) | Define Cosmos DB, API connections, and link them to a logic app.
[Azure Functions](azure-cs-functions) | Deploy a Node.js serverless function to Azure Functions.
[Static Website](azure-cs-static-website) | Configure static website hosting in Azure Storage.
[Azure Synapse](azure-cs-synapse) | Starting point for enterprise analytics solutions based on Azure Synapse.
[Azure SQL Server](azure-cs-sqlserver) | An example of a SQLServer on Azure PaaS.


## GCP

### TypeScript

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Cloud Run](gcp-ts-cloudrun) | Deploy a custom Docker image into Google Cloud Run service.
[Functions - Raw](gcp-ts-serverless-raw) | Deploy two Google Cloud Functions implemented in Python and Go.
[Functions](gcp-ts-functions) | Deploy an HTTP Google Cloud Function endpoint.
[GKE - Hello World](gcp-ts-gke-hello-world) | Deploy a GKE cluster, then a Kubernetes namespace and nginx deployment into the cluster.
[GKE](gcp-ts-gke) | Provision a Google Kubernetes Engine (GKE) cluster, then a Kubernetes Deployment.
[Ruby on Rails](gcp-ts-k8s-ruby-on-rails-postgresql) | Deliver a containerized Ruby on Rails application.
[Slackbot](gcp-ts-slackbot) | Create a simple slackbot that posts a notification to a specific channel any time you're @mentioned anywhere.

### JavaScript

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Web Server](gcp-js-webserver) | Build a web server in Google Cloud.

### Python

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Functions - Raw](gcp-py-serverless-raw) | Deploy two Google Cloud Functions implemented in Python and Go.
[Functions](gcp-py-functions) | Deploy a Python-based Google Cloud Function.
[GKE](gcp-py-gke) | Provision a Google Kubernetes Engine (GKE) cluster, then a Kubernetes Deployment.
[Network Component](gcp-py-network-component) | Use a reusable component to create a Google Cloud Network and instance.
[nginx Server](gcp-py-instance-nginx) | Build a nginx server in Google Cloud.

### Go

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Functions](gcp-go-functions) | Deploy a Go-based Google Cloud Function.
[Functions - Raw](gcp-py-serverless-raw) | Deploy a Google Cloud Function implemented in Python.
[Web Server](gcp-go-webserver) | Build a web server in Google Cloud.

### C#

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Functions - Raw](gcp-py-serverless-raw) | Deploy a Google Cloud Function implemented in Python.
[Functions](gcp-go-functions) | Deploy a Go-based Google Cloud Function.

## Kubernetes

### TypeScript

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[App Rollout via ConfigMap](kubernetes-ts-configmap-rollout) | Enable a change in a ConfigMap to trigger a rollout of an nginx Deployment.
[App Rollout via S3 Data Change](kubernetes-ts-s3-rollout) | Enable a change in data in S3 to trigger a rollout of an nginx deployment.
[Expose Deployment](kubernetes-ts-exposed-deployment) | Deploy nginx to a Kubernetes cluster, and publicly explose it using a Kubernetes Service.
[Guestbook](kubernetes-ts-guestbook) | Build and deploy a simple, multi-tier web application using Kubernetes and Docker.
[Jenkins](kubernetes-ts-jenkins) | Deploy a container running the Jenkins continuous integration system onto a running Kubernetes cluster.
[Multicloud](kubernetes-ts-multicloud) | Create managed Kubernetes clusters using AKS, EKS, and GKE, and deploy the application on each cluster.
[nginx server](kubernetes-ts-nginx) | Deploy a replicated nginx server to a Kubernetes cluster, using TypeScript and no YAML.
[Sock Shop](kubernetes-ts-sock-shop) | Deploy a version of the standard Sock Shop microservices reference app.
[Staged App Rollout](kubernetes-ts-staged-rollout-with-prometheus) | Create a staged rollout gated by checking that the P90 response time reported by Prometheus is less than some amount.
[Wordpress Helm Chart](kubernetes-ts-helm-wordpress) | Use the Helm API to deploy v2.1.3 of the Wordpress Helm Chart to a Kubernetes cluster.

### Python

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Guestbook](kubernetes-py-guestbook) | Build and deploy a simple, multi-tier web application using Kubernetes and Docker.

### C#

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Guestbook](kubernetes-cs-guestbook) | Build and deploy a simple, multi-tier web application using Kubernetes and Docker.

### Go

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Guestbook](kubernetes-go-guestbook) | Build and deploy a simple, multi-tier web application using Kubernetes and Docker.
[App Rollout via ConfigMap](kubernetes-go-configmap-rollout) | Enable a change in a ConfigMap to trigger a rollout of an nginx Deployment.
[Wordpress Helm Chart](kubernetes-go-helm-wordpress) | Use the Helm API to deploy v9.6.0 of the Wordpress Helm Chart to a Kubernetes cluster.
[Expose Deployment](kubernetes-go-exposed-deployment) | Deploy nginx to a Kubernetes cluster, and publicly expose it using a Kubernetes Service.

## Openstack

### Python

[(Click here to go back to the main list)](#outline)

[Web Server](openstack-py-webserver) | Deploy an Openstack instance and open port 8000.

## Cloud

### TypeScript

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[URL Shortener - Cache and HttpServer](cloud-ts-url-shortener-cache-http) | Create a simple URL shortener SPA that uses the high-level `cloud.Table` and `cloud.HttpServer` components.
[URL Shortener - Cache](cloud-ts-url-shortener-cache) | Create a simple URL shortener SPA that uses the high-level `cloud.Table` and `cloud.API` components.
[URL Shortener](cloud-ts-url-shortener) | Create a complete URL shortener web application that uses the high-level `cloud.Table` and `cloud.HttpServer` components.
[Voting App](cloud-ts-voting-app) | Create a simple voting app using Redis and Python Flask.

### JavaScript

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[API on AWS](cloud-js-api) | Create a simple REST API that counts the number of times a route has been hit.
[Containers](cloud-js-containers) | Provision containers on Fargate.
[HttpServer](cloud-js-httpserver) | Create a simple REST API that counts the number of times a route has been hit.
[Thumbnailer - Machine Learning](cloud-js-thumbnailer-machine-learning) | Create a video thumbnail extractor using serverless functions, containers, and AWS Rekognition.
[Thumbnailer](cloud-js-thumbnailer) | Create a video thumbnail extractor using serverless functions and containers.
[Twitter](cloud-js-twitter-athena) | Query Twitter every 2 minutes, store the results in S3, and set up an Athena table and query.

## DigitalOcean

### TypeScript

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Droplets](digitalocean-ts-loadbalanced-droplets) | Build sample architecture.
[Kubernetes](digitalocean-ts-k8s) | Provision a DigitalOcean Kubernetes cluster.

### Python

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Droplets](digitalocean-py-loadbalanced-droplets) | Build sample architecture.
[Kubernetes](digitalocean-py-k8s) | Provision a DigitalOcean Kubernetes cluster.

### C#

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Droplets](digitalocean-cs-loadbalanced-droplets) | Build sample architecture.
[Kubernetes](digitalocean-cs-k8s) | Provision a DigitalOcean Kubernetes cluster.

## Multicloud

### TypeScript

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Buckets](multicloud-ts-buckets) | Use a single Pulumi program to provision resources in both AWS and GCP.

## F5

### TypeScript

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[BigIP Local Traffic Manager](f5bigip-ts-ltm-pool) | Provide load balancing via an F5 BigIP appliance to backend HTTP instances.

## Twilio

### TypeScript

[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Component](twilio-ts-component) | Create a custom Component Resource to parse incoming messages from Twilio.

## Linode

### JavaScript


[(Click here to go back to the main list)](#outline)

Example   | Description |
--------- | --------- |
[Web Server](linode-js-webserver) | Build a web server on Linode.

## Testing

[(Click here to go back to the main list)](#outline)

Example   | Description |
-----          | --------- |
[Unit Tests in TypeScript](testing-unit-ts)      | Mock-based unit tests in TypeScript.
[Unit Tests in Python](testing-unit-py)          | Mock-based unit tests in Python.
[Unit Tests in Go](testing-unit-go)              | Mock-based unit tests in Go.
[Unit Tests in C#](testing-unit-cs)              | Mock-based unit tests in C#.
[Testing with Policies](testing-pac-ts)          | Tests based on Policy-as-Code in TypeScript.
[Integration Testing in Go](testing-integration) | Deploy-check-destroy tests in Go.

## Automation API

[(Click here to go back to the main list)](#outline)

[Automation API Examples](https://github.com/pulumi/automation-api-examples)

## Community and Social

Engage with our community to elevate your developer experience:

- **Join our online [Pulumi Community on Slack](https://slack.pulumi.com/)** - Interact with over 3K Pulumi developers for collaborative problem-solving and knowledge-sharing!
- **Join a [Local Pulumi User Groups (PUGs)](https://www.meetup.com/pro/pugs/)**-  Attend tech-packed meetups and hands-on virtual or in-person workshops.
- **Follow [@PulumiCorp](https://twitter.com/PulumiCorp) on X (Twitter)** - Get real-time updates, technical insights, and sneak peeks into the latest features.
- **Subscribe to our YouTube Channel, [PulumiTV](https://www.youtube.com/@PulumiTV)** - Learn about AI / ML essentials, launches, workshops, demos and more.
- **Follow our [LinkedIn](https://www.linkedin.com/company/pulumi/)** - Uncover company news, achievements, and behind-the-scenes glimpses.

## Contributors

Meet the [brilliant minds behind this project](https://github.com/pulumi/examples/graphs/contributors), view their profiles, and learn about their valuable contributions.

## FAQs

### How can I contribute to this repository?

We're glad you asked! Please visit our [CONTRIBUTING](CONTRIBUTING.md) doc for details.

### How can I install the Pulumi CLI?

Visit our [install page](https://www.pulumi.com/docs/install/) for installation steps.

### Is [Pulumi Cloud](https://app.pulumi.com/) free?

Individual accounts are always free and allow unlimited resources. See our [pricing page](https://www.pulumi.com/pricing/) for other options.

## Further Reading

Delve deeper into our project with additional resources:

- [Get Started with Pulumi](https://www.pulumi.com/docs/get-started/): Deploy a simple application in AWS, Azure, Google Cloud, or Kubernetes using Pulumi.
- [Registry](https://www.pulumi.com/registry/): Search for packages and learn about the supported resources you need. Install the package directly into your project, browse the API documentation, and start building.
- [Try Pulumi AI](https://www.pulumi.com/ai) - Use natural-language prompts to generate Pulumi infrastructure-as-code programs in any language.
- [Documentation](https://www.pulumi.com/docs/): Learn about Pulumi concepts, follow user guides, and consult the reference documentation.
- [Pulumi Blog](https://www.pulumi.com/blog/) - Stay in the loop with our latest tech announcements, insightful articles, and updates.
