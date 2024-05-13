# Example to build a Docker image with Docker Build Cloud (DBC)

Builds a Docker Image from an NGINX local Dockerfile. This template prompts the user for an existing DBC builder.

Last revision: May 2024.

## 📋 Pre-requisites

- [Docker Build Cloud (DBC) builder](https://build.docker.com/)  
- 🚨 You **must** complete the [DBC builder setup steps](https://docs.docker.com/build/cloud/setup/#steps) 🚨
- Docker Desktop / CLI
- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- *Recommended* [Pulumi Cloud account](https://app.pulumi.com/signup)
- [npm](https://www.npmjs.com/get-npm)

## 👩‍🏫 Get started

This Pulumi example is written as a template. It is meant to be copied via `pulumi new` as follows:

```bash
$ pulumi new https://github.com/pulumi/examples/tree/master/dockerbuild-ts-dbc
$ npm install
```
Once copied to your machine, feel free to edit as needed.

Alternatively, click the button below to use [Pulumi Deployments](https://www.pulumi.com/docs/pulumi-cloud/deployments/) to deploy this app:

[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/dockerbuild-ts-dbc/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/dockerbuild-ts-dbc/README.md#gh-dark-mode-only)

## 🎬 How to run

To deploy your infrastructure, run:

```bash
$ pulumi up
# select 'yes' to confirm the expected changes
# 🎉 Ta-Da! 
```

## 🧹 Clean up

To clean up your infrastructure, run:

```bash
$ pulumi destroy
# select 'yes' to confirm the expected changes
```
