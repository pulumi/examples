# Pulumi Examples

This repository contains examples of using Pulumi to build and deploy cloud applications and infrastructure.

Each example has a two-part prefix, `<cloud>-<language>`, to indicate which `<cloud>` and `<language>` it pertains to.
For example, `<cloud>` could be `aws` for [Amazon Web Services](https://github.com/pulumi/pulumi-aws), `azure` for [Microsoft
Azure](https://github.com/pulumi/pulumi-azure), `gcp` for [Google Cloud
Platform](https://github.com/pulumi/pulumi-gcp), `kubernetes` for
[Kubernetes](https://github.com/pulumi/pulumi-kubernetes), or `cloud` for
[Pulumi's cross-cloud programming framework](https://github.com/pulumi/pulumi-cloud).

See the [Pulumi documentation](https://www.pulumi.com/docs/) for more details on getting started with Pulumi.

## Outline

- [AWS](#aws)
    - [Typescript](#typescript)
	- [Javascript](#javascript)
	- [Python](#python)
	- [Go](#go)
	- [C#](#c)
	- [F#](#f)
- [Azure](#azure) 
    - [Typescript](#typescript-1)
	- [Javascript](#javascript-1)
	- [Python](#python-1)
	- [Go](#go-1)
	- [C#](#c-1)
	- [F#](#f-1)
- [GCP](#gcp) 
    - [Typescript](#typescript-2)
	- [Javascript](#javascript-2)
	- [Python](#python-2)
	- [Go](#go-2)
	- [C#](#c-2)
- [Kubernetes](#kubernetes)
- [Cloud](#cloud)
- [DigitalOcean](#digitalocean)
- [Multicloud](#multicloud)
- [F5](#f5)
- [Twilio](#twilio)
- [Linode](#linode)
- [Packet](#packet)

## AWS

### Typescript

Example		| Description |
----- 		| --------- |
[API Gateway](aws-ts-apigateway) | Deploy a simple REST API that counts the number of times a route has been hit.
[Apigateway - Auth0](aws-ts-apigateway-auth0) | Deploy a simple REST API protected by Auth0.
[AppSync](aws-ts-appsync) | Deploy a basic GraphQL endpoint in AWS AppSync.
[AssumeRole](aws-ts-assume-role) | Use AssumeRole to create resources.
[Containers](aws-ts-containers) | Provision containers on Fargate.
[EKS - Dashboard](aws-ts-eks) | Deploy an EKS Kubernetes cluster with an EBS-backed StorageClass, then the Kubernetes Dashboard into the cluster.
[EKS - Hello World](aws-ts-eks-hello-world) | Deploy an EKS Kubernetes cluster with an EBS-backed StorageClass, then a Kubernetes namespace and nginx deployment into the cluster.
[EKS - Migrate Node Groups](aws-ts-migrate-nodegroups) | Create an EKS cluster and node group to use for workload migration with zero downtime.
[Fargate](aws-ts-hello-fargate) | Build, deploy, and run a Dockerized app using ECS, ECR, and Fargate.
[Miniflux](aws-ts-pulumi-miniflux) | Stand up an RSS Service using Fargate and RDS.
[Pulumi Webhooks](aws-ts-pulumi-webhooks) | Create a Pulumi `cloud.HttpEndpoint` that receives webhook events delivered by the Pulumi Service, then echos the event to Slack.
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
[Web Server with Manual Provisioning](aws-ts-ec2-provisioners) | Use Pulumi dynamic providers to accomplish post-provisioning configuration steps.

### Javascript

Example		| Description |
----- 		| --------- |
[Containers](aws-js-containers) | Provision containers on Fargate.
[S3 Folder Component](aws-js-s3-folder-component) | Serve a static website on S3 from a component.
[S3 Folder](aws-js-s3-folder) | Serve a static website on S3.
[Servless SQS to Slack](aws-js-sqs-slack) | Wire up a serverless AWS Lambda to an AWS SQS queue and post a message to Slack.
[Web Server - Component](aws-js-webserver-component) | Deploy an EC2 instance using a common module for creating an instance.
[Web Server](aws-js-webserver) | Deploy an EC2 Virtual machine running a Python web server.

### Python

Example		| Description |
----- 		| --------- |
[AppSync](aws-py-appsync) | Deploy a basic GraphQL endpoint in AWS AppSync.
[Fargate](aws-py-fargate) | Provision a full ECS Fargate cluster running a load-balanced nginx web server.
[Resources](aws-py-resources) | Create various resources, including `cloudwatch.Dashboard`, `cloudwatch.EventRule`, `cloudwatch.LogGroup`, and `sqs.Queue`.
[S3 Folder](aws-py-s3-folder) | Serve a static website on S3.
[Stack Reference](aws-py-stackreference) | Create a "team" EC2 Instance with tags set from upstream stacks.
[Step Functions](aws-py-stepfunctions) | Use Step Functions with a Lambda function.
[Web Server](aws-py-webserver) | Deploy an EC2 instance and open port 80.

### Go

Example		| Description |
----- 		| --------- |
[Fargate](aws-go-fargate) | Provision a full ECS Fargate cluster running a load-balanced nginx web server.
[Lambda](aws-go-lambda) | Create a lambda that does a simple `ToUpper` on the string input and returns it.
[S3 Folder](aws-go-s3-folder) | Serve a static website on S3.
[Web Server](aws-go-webserver) | Deploy an EC2 Virtual machine running a Python web server.

### C#

Example		| Description |
----- 		| --------- |
[Fargate](aws-cs-fargate) | Build, deploy, and run a Dockerized app using ECS, ECR, and Fargate.
[Lambda](aws-cs-lambda) | Create a lambda that does a simple `ToUpper` on the string input and returns it.
[Web Server](aws-cs-webserver) | Deploy an EC2 instance and open port 80.

### F#

Example		| Description |
----- 		| --------- |
[Lambda Web Server](aws-fs-lambda-webserver) | Create a web server in AWS lambda using the Giraffe web server.

## Azure

### Typescript

Example		| Description |
----- 		| --------- |
[AKS - Helm](azure-ts-aks-helm) | Create an Azure Kubernetes Service (AKS) Cluster and deploy a Helm Chart into it.
[AKS - KEDA](azure-ts-aks-keda) | Create an Azure Kubernetes Service (AKS) Cluster and deploy an Azure Function App with Kubernetes-based Event Driven Autoscaling (KEDA) into it.
[AKS - Mean](azure-ts-aks-mean) | Stand up an Azure Kubernetes Service (AKS) Cluster and a MongoDB-flavored instance of CosmosDB.
[AKS - Multicluster](azure-ts-aks-multicluster) | Create multiple Azure Kubernetes Service (AKS) Clusters in different regions and with different node counts.
[API Management](azure-ts-api-management) | Deploy an instance of Azure API Management.
[App Service - DevOps](azure-ts-appservice-devops) | Deploy a Todo App using App Service with SQL Database and integrated with DevOps.
[App Service - Docker](azure-ts-appservice-docker) | Build a web application hosted in App Service from Docker images.
[App Service - Spring Boot](azure-ts-appservice-Springboot) | Deploy a Spring Boot app to an App Service instance using Jenkins.
[App Service](azure-ts-appservice) | Build a web application hosted in App Service and provision Azure SQL Database and Azure Application Insights.
[ARM Template](azure-ts-arm-template) | Deploy an existing Azure Resource Manager (ARM) template.
[CosmosApp Component](azure-ts-cosmosapp-component) | Use a reusable component to create globally-distributed applications with Azure Cosmos DB.
[CosmosDB LogicApp](azure-ts-cosmosdb-logicapp) | Use Azure Resource Manager (ARM) templates to create an API Connection and a Logic App.
[Dynamic Resource](azure-ts-dynamicresource) | Add a custom domain to a CDN endpoint.
[Functions - Raw](azure-ts-functions-raw) | Deploy functions in all supported languages to Azure Functions.
[Functions](azure-ts-functions) | Deploy a typescript function to Azure Functions.
[HDInsight Spark](azure-ts-hdinsight-spark) | Deploy a Spark cluster on Azure HDInsight.
[MSI KeyVault RBAC](azure-ts-msi-keyvault-rbac) | Use a managed identity with Azure App Service to access Azure KeyVault, Azure Storage, and Azure SQL Database without passwords or secrets.
[Static Website](azure-ts-static-website) | Configure static website hosting in Azure Storage.
[Stream Analytics](azure-ts-stream-analytics) | Deploy an Azure Stream Analytics job to transform data in an Event Hub.
[URL Shortener](azure-ts-serverless-url-shortener-global) | Create a globally-distributed serverless URL shortener using Azure Functions and Cosmos DB.
[VM Scaleset](azure-ts-vm-scaleset) | Provision a Scale Set of Linux web servers with nginx deployed, auto-scaling based on CPU load, a Load Balancer in front of them, and a public IP address.
[Web Server Component](azure-ts-webserver-component) | Provision a configurable number of Linux web servers in an Azure Virtual Machine using a reusable component.
[Web Server](azure-ts-webserver) | Provision a Linux web server in an Azure Virtual Machine.

### Javascript

Example		| Description |
----- 		| --------- |
[Web Server](azure-js-webserver) | Build the Pulumi web server sample in Azure.

### Python

Example		| Description |
----- 		| --------- |
[AKS - Multicluster](azure-py-aks-multicluster) | Create multiple AKS clusters in different regions and with different node counts.
[AKS](azure-py-aks) | Deploy an AKS cluster, virtual network and Azure Container Registry and grant AKS permissions to access and manage those.
[App Service - Docker](azure-py-appservice-docker) | Build a web application hosted in App Service from Docker images.
[App Service](azure-py-appservice) | Build a web application hosted in App Service and provision Azure SQL Database and Azure Application Insights.
[Functions - Raw](azure-py-functions-raw) | Deploy a function to Azure Functions created from raw deployment packages in C#.
[HDInsight Spark](azure-py-hdinsight-spark) | Deploy a Spark cluster on Azure HDInsight.
[MSI Key Vault RBAC](azure-msi-keyvault-rbac) | Use a managed identity with Azure App Service to access Azure KeyVault, Azure Storage, and Azure SQL Database without passwords or secrets.
[VM Scale Set](azure-vm-scaleset) | Provision a Scale Set of Linux web servers with nginx deployed, auto-scaling based on CPU load, a Load Balancer in front of them, and a public IP address.
[Web Server Component](azure-py-webserver-component) | Deploy a Virtual Machine and start an HTTP server on it using a reusable component.
[Web Server](azure-py-webserver) | Deploy a Virtual Machine and start an HTTP server on it.

### Go

Example		| Description |
----- 		| --------- |
[App Service](azure-go-appservice) | Build a web application hosted in Azure App Service.
[Web Server Component](azure-go-webserver-component) | Provision a configurable number of Linux web servers in an Azure Virtual Machine using a reusable component.

### C#

Example		| Description |
----- 		| --------- |
[AKS](azure-cs-aks) | Stand up an Azure Kubernetes Service (AKS) cluster.
[AKS and Private Container Registry](azure-cs-aks-private-container-registry) | Stand up an Azure Kubernetes Service (AKS) cluster, a private Azure Container Registry, and deploys an image to the cluster.
[App Service](azure-cs-appservice) | Build a web application hosted in App Service and provision Azure SQL Database and Azure Application Insights.
[Bot Service](azure-cs-botservice) | Build an Azure Bot Service hosted in Azure App Service.
[Cosmos App Component](azure-cs-cosmosapp-component) | Use a reusable component to create globally-distributed applications with Azure Cosmos DB.
[Functions - Raw](azure-cs-functions-raw) | Deploy a function to Azure Functions created from raw deployment packages in C#.
[MSI Key Vault RBAC](azure-cs-msi-keyvault-rbac) | Use a managed identity with Azure App Service to access Azure KeyVault, Azure Storage, and Azure SQL Database without passwords or secrets.
[Static Website](azure-cs-static-website) | Deploy a Static Website to Azure Storage.
[Web Server](azure-cs-webserver) | Deploy a Virtual Machine and start an HTTP server on it.

### F#

Example		| Description |
----- 		| --------- |
[AKS](azure-fs-aks) | Stand up an Azure Kubernetes Service (AKS) cluster.
[App Service](azure-fs-appservice) | Build a web application hosted in App Service and provision Azure SQL Database and Azure Application Insights.

## GCP

### Typescript

Example		| Description |
----- 		| --------- |
[Cloud Run](gcp-ts-cloudrun) | Deploy a custom Docker image into Google Cloud Run service.
[Functions - Raw](gcp-ts-serverless-raw) | Deploy two Google Cloud Functions implemented in Python and Go.
[Functions](gcp-ts-functions) | Deploy an HTTP Google Cloud Function endpoint.
[GKE - Hello World](gcp-ts-gke-hello-world) | Deploy a GKE cluster, then a Kubernetes namespace and nginx deployment into the cluster.
[GKE](gcp-ts-gke) | Provision a Google Kubernetes Engine (GKE) cluster, then a Kubernetes Deployment.
[Ruby on Rails](gcp-ts-k8s-ruby-on-rails-postgresql) | Deliver a containerized Ruby on Rails application.
[Slackbot](gcp-ts-slackbot) | Create a simple slackbot that posts a notification to a specific channel any time you're @mentioned anywhere.

### Javascript

Example		| Description |
----- 		| --------- |
[Web Server](gcp-js-webserver) | Build a web server in Google Cloud.

### Python

Example		| Description |
----- 		| --------- |
[Functions - Raw](gcp-py-serverless-raw) | Deploy two Google Cloud Functions implemented in Python and Go.
[Functions](gcp-py-functions) | Deploy a Python-based Google Cloud Function.
[GKE](gcp-py-gke) | Provision a Google Kubernetes Engine (GKE) cluster, then a Kubernetes Deployment.
[Network Component](gcp-py-network-component) | Use a reusable component to create a Google Cloud Network and instance.
[nginx Server](gcp-py-instance-nginx) | Build a nginx server in Google Cloud.

### Go

Example		| Description |
----- 		| --------- |
[Functions](gcp-go-functions) | Deploy a Go-based Google Cloud Function.
[Functions - Raw](gcp-py-serverless-raw) | Deploy a Google Cloud Function implemented in Python.

### C#

Example		| Description |
----- 		| --------- |
[Functions - Raw](gcp-py-serverless-raw) | Deploy a Google Cloud Function implemented in Python.
[Functions](gcp-go-functions) | Deploy a Go-based Google Cloud Function.

## Kubernetes

### Typescript

Example		| Description |
----- 		| --------- |
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

Example		| Description |
----- 		| --------- |
[Guestbook](kubernetes-py-guestbook) | Build and deploy a simple, multi-tier web application using Kubernetes and Docker.

### C#

Example		| Description |
----- 		| --------- |
[Guestbook](kubernetes-cs-guestbook) | Build and deploy a simple, multi-tier web application using Kubernetes and Docker.

## Cloud

### Typescript

Example		| Description |
----- 		| --------- |
[URL Shortener - Cache and HttpServer](cloud-ts-url-shortener-cache-http) | Create a simple URL shortener SPA that uses the high-level `cloud.Table` and `cloud.HttpServer` components.
[URL Shortener - Cache](cloud-ts-url-shortener-cache) | Create a simple URL shortener SPA that uses the high-level `cloud.Table` and `cloud.API` components.
[URL Shortener](cloud-ts-url-shortener) | Create a complete URL shortener web application that uses the high-level `cloud.Table` and `cloud.HttpServer` components.
[Voting App](cloud-ts-voting-app) | Create a simple voting app using Redis and Python Flask.

### Javascript

Example		| Description |
----- 		| --------- |
[API on AWS](cloud-js-api) | Create a simple REST API that counts the number of times a route has been hit.
[Containers](cloud-js-containers) | Provision containers on Fargate.
[HttpServer](cloud-js-httpserver) | Create a simple REST API that counts the number of times a route has been hit.
[Thumbnailer - Machine Learning](cloud-js-thumbnailer-machine-learning) | Create a video thumbnail extractor using serverless functions, containers, and AWS Rekognition.
[Thumbnailer](cloud-js-thumbnailer) | Create a video thumbnail extractor using serverless functions and containers.
[Twitter](cloud-js-twitter-athena) | Query Twitter every 2 minutes, store the results in S3, and set up an Athena table and query.

## DigitalOcean

### Typescript

Example		| Description |
----- 		| --------- |
[Droplets](digitalocean-ts-loadbalanced-droplets) | Build sample architecture.
[Kubernetes](digitalocean-ts-k8s) | Provision a DigitalOcean Kubernetes cluster.

### Python

Example		| Description |
----- 		| --------- |
[Droplets](digitalocean-py-loadbalanced-droplets) | Build sample architecture.
[Kubernetes](digitalocean-py-k8s) | Provision a DigitalOcean Kubernetes cluster.

### C#

Example		| Description |
----- 		| --------- |
[Droplets](digitalocean-cs-loadbalanced-droplets) | Build sample architecture.
[Kubernetes](digitalocean-cs-k8s) | Provision a DigitalOcean Kubernetes cluster.

## Multicloud

### Typescript
Example		| Description |
----- 		| --------- |
[Buckets](multicloud-ts-buckets) | Use a single Pulumi program to provision resources in both AWS and GCP. 

## F5

### Typescript
Example		| Description |
----- 		| --------- |
[BigIP Local Traffic Manager](f5bigip-ts-ltm-pool) | Provide load balancing via an F5 BigIP appliance to backend HTTP instances.

## Twilio

### Typescript
Example		| Description |
----- 		| --------- |
[Component](twilio-ts-component) | Create a custom Component Resource to parse incoming messages from Twilio.

## Linode

### Javascript
Example		| Description |
----- 		| --------- |
[Web Server](linode-js-webserver) | Build a web server on Linode.

## Packet

### Typescript
Example		| Description |
----- 		| --------- |
[Web Server](packet-ts-webserver) | Build a web server on Packet.net.

### Python
Example		| Description |
----- 		| --------- |
[Web Server](packet-py-webserver) | Build a web server on Packet.net.

