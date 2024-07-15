# Deploys a container with a Docker Build image on AWS Fargate

Deploys a AWS Fargate service. The service uses a Docker image that is build with the new Docker Build provider. The image is pushed to AWS ECR.

Last revision: July 2024.

## 📋 Pre-requisites

- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- *Recommended* [Pulumi Cloud account](https://app.pulumi.com/signup)
- [npm](https://www.npmjs.com/get-npm)
- AWS account and credentials configured
- Docker desktop with a default builder.

## 👩‍🏫 Get started

This Pulumi example is written as a template. It is meant to be copied via `pulumi new` as follows:

```bash
pulumi new https://github.com/pulumi/examples/tree/master/aws-ts-containers-dockerbuild
npm install
```

Once copied to your machine, feel free to edit as needed.

## 🎬 How to run

To deploy your infrastructure, run:

```bash
$ pulumi up
# select 'yes' to confirm the expected changes
# wait a bit for everything to get deployed
# ...
# confirm your service is up and running
$ curl $(pulumi stack output url)
# 🎉 Ta-Da!
```

## 🧹 Clean up

To clean up your infrastructure, run:

```bash
$ pulumi destroy
# select 'yes' to confirm the expected changes
```
