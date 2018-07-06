# Pulumi Examples

This repository contains examples of using Pulumi to build and deploy cloud applications and infrastructure.

Each example has a two-part prefix, `<cloud>-<language>`, to indicate which `<cloud>` and `<language>` it pertains to.
The cloud is one of `aws` for [Amazon Web Services](https://github.com/pulumi/pulumi-aws), `azure` for [Microsoft
Azure](https://github.com/pulumi/pulumi-azure), `gcp` for [Google Cloud
Platform](https://github.com/pulumi/pulumi-gcp), `kubernetes` for
[Kubernetes](https://github.com/pulumi/pulumi-kubernetes), or `cloud` for
[Pulumi's cross-cloud programming framework](https://github.com/pulumi/pulumi-cloud).

See the [Pulumi documentation](https://pulumi.io) for more details on getting started with Pulumi.

### Cloud Infrastructure

Example                 | Language          | Cloud |
-----                   | -------           | ------| 
[AWS EC2 instance (JavaScript)](aws-js-webserver) <br/> Provision a simple Linux web server that serves traffic on port 80 | JavaScript | AWS |
[AWS EC2 instance (Python)](aws-py-webserver) <br/> Provision a simple Linux web server that serves traffic on port 80 | Python | AWS |
[Azure Virtual Machine (JavaScript)](azure-js-webserver) <br/> Provision a simple Linux web server that serves traffic on port 80 | JavaScript | Azure |
[GCP Virtual Machine (JavaScript)](gcp-js-webserver) <br/> Provision a simple Linux web server that serves traffic on port 80 | JavaScript | Google Cloud Platform |
[Component for creating EC2 instances (JavaScript)](aws-js-webserver-component/) <br/>A minimal component that encapsulates creating EC2 instances | JavaScript | AWS |
[Simple static website on AWS S3 (JavaScript)](aws-js-s3-folder) <br/> A simple program that uses S3's website support | JavaScript | AWS |
[Component for simple static website (JavaScript)](aws-js-s3-folder-component) <br/> A reusable component for hosting static websites on AWS S3 | JavaScript | AWS |
[Simple static website on AWS S3 (Go)](aws-go-s3-folder) <br/> A static website that uses S3's website support | Go | AWS |
[Production-ready static website on AWS (TypeScript)](aws-ts-static-website) <br/> An end-to-end example for hosting a static website on AWS, using S3, CloudFront, Route53, and Amazon Certificate Manager | TypeScript | AWS |
[Jenkins on Kubernetes (JavaScript)](kubernetes-ts-jenkins) <br/> A Jenkins container running on Kubernetes | JavaScript | Kubernetes |
[AWS RDS and Airflow (TypeScript)](aws-ts-airflow)<br/> Deploys an RDS Postgres instance and containerized Airflow | TypeScript | AWS |
[CloudWatch Log Groups, Event Targets, Metric Alarms, IAM roles, and more! (TypeScript)](aws-ts-resources) <br/> An example that shows how to create a number of AWS resources, including `cloudwatch.Dashboard`, `cloudwatch.EventRule`, `cloudwatch.LogGroup`, `sqs.Queue`, and more. | TypeScript | AWS | 
[Azure App Service with SQL Database and Application Insights](azure-ts-appservice) <br/> Deploy Azure App Service along with SQL Database and Application Insights | TypeScript | Azure |
[Azure Functions](azure-ts-functions) <br/> A simple component for deploying inline code to Azure Functions | TypeScript | Azure |

### Cloud Applications

Example                 | Language          | Cloud |
-----                   | -------           | ------| 
[Serverless REST API (JavaScript)](cloud-js-api) <br/> A simple REST API to count the number of times a route has been hit | JavaScript | AWS |
[NGINX container on AWS ECS (JavaScript)](cloud-js-containers) <br/> In 15 lines of code, deploy an NGINX container to production | JavaScript | AWS |
[Serverless URL shortener (TypeScript)](cloud-ts-url-shortener) <br/> A complete URL shortener web application using high-level `cloud.Table` and `cloud.HttpEndpoint` components | TypeScript | AWS |
[Serverless URL shortener with cache (TypeScript)](cloud-ts-url-shortener-cache) <br/> An extension of the URL shortener that adds a Redis cache | TypeScript | AWS |
[Serverless video thumbnailer with Lambda and Fargate (JavaScript)](cloud-js-thumbnailer) <br/> An end-to-end pipeline for generating keyframe thumbnails from videos uploaded to a bucket using containerized FFmpeg | JavaScript | AWS |
[Serverless video thumbnailer with machine learning (JavaScript)](cloud-js-thumbnailer-machine-learning) <br/> An extension of the video thumbnail example that uses AWS Rekognition video labels | JavaScript | AWS |
[Raw AWS Serverless (TypeScript and C#)](aws-ts-serverless-raw) <br/> A complete serverless C# application using that uses the raw resources `aws.apigateway.RestAPI`, `aws.lambda.Function` and `aws.dynamodb.Table` | TypeScript | AWS |
[Voting App with containers (TypeScript)](cloud-ts-voting-app) <br/> A simple voting app that uses Redis for a data store and a Python Flask app for the frontend, demonstrating the high-level framework `@pulumi/cloud`. | TypeScript | AWS |
[Kubernetes Guestbook (TypeScript)](kubernetes-ts-guestbook/) <br/>A version of the [Kubernetes Guestbook](https://kubernetes.io/docs/tutorials/stateless-application/guestbook/) app using Pulumi and `@pulumi/kubernetes` | TypeScript | Kubernetes | 
[Kubernetes Sock Shop (TypeScript)](kubernetes-ts-sock-shop) <br/> A version of the standard [Sock Shop microservices reference app](https://github.com/microservices-demo/microservices-demo) app using Pulumi and `@pulumi/kubernetes` | TypeScript | Kubernetes |
[AWS Athena Twitter Analyzer (JavaScript)](cloud-js-twitter-athena) <br/> An application that periodically queries Twitter for a search term, stores the results in S3, and configures an Athena query for data analysis | JavaScript | AWS |
[Serverless SQS to Slack (JavaScript)](aws-js-sqs-slack) <br/> Uses a Lambda function to post SQS messages to a Slack channel | JavaScript | AWS |
[AWS Step Functions](aws-ts-stepfunctions) <br/> A basic example that demonstrates using AWS Step Functions with a Lambda function | TypeScript | AWS | 
[Twilio SMS handler for API Gateway](twilio-ts-component) <br/>A sample component that makes it easy to connect AWS API Gateway and Twilio SMS | TypeScript | AWS |
