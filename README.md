# Pulumi Examples

This repository contains examples of using Pulumi to build and deploy cloud applications and infrastructure.

Each example has a two-part prefix, `<cloud>-<language>`, to indicate which `<cloud>` and `<language>` it pertains to.
The cloud is one of `aws` for [Amazon Web Services](https://github.com/pulumi/pulumi-aws), `azure` for [Microsoft
Azure](https://github.com/pulumi/pulumi-azure), `gcp` for [Google Cloud
Platform](https://github.com/pulumi/pulumi-gcp), `kubernetes` for
[Kubernetes](https://github.com/pulumi/pulumi-kubernetes), or `cloud` for
[Pulumi's cross-cloud programming framework](https://github.com/pulumi/pulumi-cloud).

See the [Pulumi documentation](https://www.pulumi.com/docs/) for more details on getting started with Pulumi.

## AWS

### Typescript

Example		| Description |
----- 		| --------- |
[RDS and Airflow](aws-ts-airflow) | Deploy a RDS Postgres instance and containerized Airflow.
[Apigateway - Auth0](aws-ts-apigateway-auth0) | Deploy a simple REST API protected by Auth0.
[Apigateway](aws-ts-apigateway) | Deploy a simple REST API that counts the number of times a route has been hit.
[AppSync](aws-ts-appsync) | Deploy a basic GraphQL endpoint in AWS AppSync.
[Assume Role](aws-ts-assume-role) | Use AssumeRole to create resources.
[Containers](aws-ts-containers) | Provision containers on Fargate.
[Web Server with Manual Provisioning](aws-ts-ec2-provisioners) | Use Pulumi dynamic providers to accomplish post-provisioning configuration steps.
[EKS - Hello World](aws-ts-eks-hello-world) | Deploy an EKS Kubernetes cluster with an EBS-backed StorageClass, then a Kubernetes namespace and NGINX deployment into the cluster.
[EKS - Migrate Node Groups](aws-ts-migrate-nodegroups) | Create an EKS cluster and node group to use for workload migration with zero downtime.
[EKS - Dashboard](aws-ts-eks) | Deploy an EKS Kubernetes cluster with an EBS-backed StorageClass, then the Kubernetes Dashboard into the cluster.
[Fargate](aws-ts-hello-fargate) | Build, deploy, and run a Dockerized app using ECS, ECR, and Fargate.
[Miniflux](aws-ts-pulumi-miniflux) | Stand up an RSS Service using Fargate and RDS.
[Pulumi Webhooks](aws-ts-pulumi-webhooks) | Create a Pulumi `cloud.HttpEndpoint` that receives webhook events delivered by the Pulumi Service, then echos the event to Slack.
[Resources](aws-ts-resources) | Create various resources, including `cloudwatch.Dashboard`, `cloudwatch.EventRule`, `cloudwatch.LogGroup`, and `sqs.Queue`.
[Ruby on Rails](aws-ts-ruby-on-rails) | Create a single EC2 virtual machine instance and uses a local MySQL database for storage.
[S3 Lambda](aws-s3-lambda-copyzip) | Set up two AWS S3 Buckets and a single Lambda that listens to one and, upon each new object arriving in it, zips it up and copies it to the second bucket.
[Serverless Datawarehouse](aws-ts-serverless-datawarehouse) | Deploy a serverless data warehouse.
[Serverless Application](aws-ts-serverless-raw) | Deploy a complete serverless C# application using raw resources from `@pulumi/aws`.
[Slackbot](aws-ts-slackbot) | Create a simple slackbot that posts a notification to a specific channel any time you're @mentioned anywhere.
[Stack Reference](aws-ts-stackreference) | Create a "team" EC2 Instance with tags set from upstream stacks.
[Static Website](aws-ts-static-website) | Serve a static website using S3, CloudFront, Route53, and Certificate Manager. 
[Step Functions](aws-ts-stepfunctions) | Use Step Functions with a Lambda function.
[Thumbnailer](aws-ts-thumbnailer) | Create a video thumbnail extractor using serverless functions and containers.
[Twitter](aws-ts-twitter-athena) | Query Twitter every 2 minutes, store the results in S3, and set up an Athena table and query.
[URL Shortener](aws-ts-url-shortener-cache-http) | Create a serverless URL shortener that uses the high-level components.
[Voting App](aws-ts-voting-app) | Create a simple voting app using Redis and Python Flask.

### Javascript

Example		| Description |
----- 		| --------- |
[Containers](aws-js-containers) | Provision containers on Fargate.
[S3 Folder Component](aws-js-s3-folder-component) | Serve a static website on S3 from a component.
[S3 Folder](aws-js-s3-folder) | Serve a static website on S3.
[Servless SQS to Slack](aws-js-sqs-slack) | Wire up a serverless AWS Lambda to an AWS SQS queue and post a message to Slack
[Web Server - Common Instance](aws-js-webserver-component) | Deploy an EC2 instance using a common module for creating an instance.
[Web Server](aws-js-webserver) | Deploy an EC2 Virtual machine running a Python web server.

### Python

Example		| Description |
----- 		| --------- |
[AppSync](aws-py-appsync) | Deploy a basic GraphQL endpoint in AWS AppSync.
[Fargate](aws-py-fargate) | Provision a full ECS Fargate cluster running a load-balanced NGINX web server.
[Resources](aws-py-resources) | Create various resources, including `cloudwatch.Dashboard`, `cloudwatch.EventRule`, `cloudwatch.LogGroup`, and `sqs.Queue`.
[S3 Folder](aws-py-s3-folder) | Serve a static website on S3.
[Stack Reference](aws-py-stackreference) | Create a "team" EC2 Instance with tags set from upstream stacks.
[Step Functions](aws-py-stepfunctions) | Use Step Functions with a Lambda function.
[Web Server](aws-py-webserver) | Deploy an EC2 instance and open port 80.

### Go

Example		| Description |
----- 		| --------- |
[Fargate](aws-go-fargate) | Provision a full ECS Fargate cluster running a load-balanced NGINX web server.
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
