# Pulumi Examples

This repository contains examples of using Pulumi to build and deploy cloud applications and infrastructure.  

See the [Pulumi documentation](https://docs.pulumi.com) for more details on getting started with Pulumi.

### [URL shortener](url-shortener/)

Build a complete URL shortener web application using high-level `cloud.Table` and `cloud.HttpEndpoint` components.  Highlights the ability to combine deployment time and runtime code, and the simple, cloud-agnostic, programming model of `@pulumi/cloud`. An [extension of this example](url-shortener-with-cache/) adds a reusable cache component to the URL shortener using `cloud.Service` to run a containerized Redis image.

### [Web server](webserver/)

Deploy an EC2 instance using `@pulumi/aws`.  An [extension of this example](webserver-component/) extracts out a webserver-component/ for creating EC2 instances, highlighting one of the benefits of using a general purpose language for managing infrastructure. 

### [Video thumbnailer](video-thumbnailer/)

Create an end-to-end pipleine for generating keyframe thumbnails from videos uploaded to a bucket using containerized [FFmpeg](https://www.ffmpeg.org/).  Combines containers, serverless functions, and cloud storage into a single 40-line application using `@pulumi/cloud-aws`.

### [Serverless raw](serverless-raw/)

Deploy a complete serverless C# application using raw `aws.apigateway.RestAPI`, `aws.lambda.Function` and `aws.dynamodb.Table` resources from `@pulumi/aws`.  The deployed Lambda function is a simple C# application, highlighting the ability to manage existing application code in a Pulumi application.
