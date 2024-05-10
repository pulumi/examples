# Deploy a container with a DBC-built image on AWS Fargate

Deploys a AWS Fargate service. The service uses a Docker image that is build with Docker Build Cloud (DBC). The image is pushed to AWS ECR. This template prompts the user for an existing DBC builder.

Last revision: May 2024.

## 📋 Pre-requisites

- [Docker Build Cloud (DBC) builder](https://build.docker.com/)  
- 🚨 You **must** complete the [DBC builder setup steps](https://docs.docker.com/build/cloud/setup/#steps) 🚨
- Docker Desktop / CLI
- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- *Recommended* [Pulumi Cloud account](https://app.pulumi.com/signup)
- [npm](https://www.npmjs.com/get-npm)
- AWS account and local credentials configured

## 👩‍🏫 Get started

This Pulumi example is written as a template. It is meant to be copied via `pulumi new` as follows:

```bash
$ pulumi new https://github.com/pulumi/examples/tree/master/aws-ts-containers-dbc
$ npm install
```

Once copied to your machine, feel free to edit as needed.

Alternatively, click the button below to use [Pulumi Deployments](https://www.pulumi.com/docs/pulumi-cloud/deployments/) to deploy this app:

[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-containers-dbc)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-containers-dbc/README.md#gh-dark-mode-only)

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

## 🧐 Useful resources

- [🤖Try Pulumi AI](https://www.pulumi.com/ai) - Use natural-language prompts to generate Pulumi infrastructure-as-code programs in any language.
- [📋 Registry](https://www.pulumi.com/registry/) - Search for packages and learn about the supported resources you need. Install the package directly into your project, browse the API documentation, and start building.
- [📚 Documentation](https://www.pulumi.com/docs/) - Learn about Pulumi concepts, follow user guides, and consult the reference documentation.

## 🏘️ Community and Social

Engage with our community to elevate your developer experience:

- **Join our online [Pulumi Community on Slack](https://slack.pulumi.com/)** - Interact with over 13K Pulumi developers for collaborative problem-solving and knowledge-sharing!
- **Join a [Local Pulumi User Groups (PUGs)](https://www.meetup.com/pro/pugs/)** -  Attend tech-packed meetups and hands-on virtual or in-person workshops.
- **Follow [@PulumiCorp](https://twitter.com/PulumiCorp) on X (Twitter)** - Get real-time updates, technical insights, and sneak peeks into the latest features.
- **Subscribe to our YouTube Channel, [PulumiTV](https://www.youtube.com/@PulumiTV)** - Learn about AI / ML essentials, launches, workshops, demos and more.
- **Follow our [LinkedIn](https://www.linkedin.com/company/pulumi/)** - Uncover company news, achievements, and behind-the-scenes glimpses.
