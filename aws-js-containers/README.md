[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-js-containers/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-js-containers/README.md#gh-dark-mode-only)

# ECS Fargate Containers

Companion to the tutorial [Provision containers on AWS](https://www.pulumi.com/docs/tutorials/aws/ecs-fargate/).

## Prerequisites

To run this example, make sure [Docker Engine - Community](https://docs.docker.com/engine/installation/) is installed and running.

## Deploy the App

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

### Step 1:  Create a new stack

    ```
    $ pulumi stack init containers-dev
    ```

### Step 2:  Configure AWS region for Pulumi

For this example, you need to set an AWS region that supports Fargate. Refer to the [AWS Region Table](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/) for product availability.

    ```
    $ pulumi config set aws:region us-west-2
    ```

### Step 3: Restore NPM modules

You can do this via `npm install` or `yarn install`.

### Step 4:.  Preview and deploy the app

Run the following command:

    ```
    $ pulumi up
    ```
The preview will take a few minutes, as it builds a Docker container. A total of 19 resources are created.

### Step 5:  View the endpoint URL

Run [`pulumi stack output`](https://www.pulumi.com/docs/reference/cli/pulumi_stack_output/) to view your stack's output properties, and then `curl` the command to view the resulting page. `$(pulumi stack output url)` evaluates to the load balancer’s URL.

    ```bash
    $ pulumi stack output
    Current stack outputs (1)
        OUTPUT                  VALUE
        hostname                http://***.elb.us-west-2.amazonaws.com

    $ curl $(pulumi stack output hostname)
    <html>
        <head><meta charset="UTF-8">
        <title>Hello, Pulumi!</title></head>
    <body>
        <p>Hello, S3!</p>
        <p>Made with ❤️ with <a href="https://pulumi.com">Pulumi</a></p>
    </body></html>
    ```

### Step 6: View runtime logs from the container

Use the [`pulumi logs`](https://www.pulumi.com/docs/reference/cli/pulumi_logs/) command. To get a log stream, use `pulumi logs --follow`.

    ```
    $ pulumi logs --follow
    Collecting logs for stack aws-js-containers-dev since 2018-05-22T14:25:46.000-07:00.
    2018-05-22T15:33:22.057-07:00[                  pulumi-nginx] 172.31.13.248 - - [22/May/2018:22:33:22 +0000] "GET / HTTP/1.1" 200 189 "-" "curl/7.54.0" "-"
    ```

## Clean Up

To clean up resources, run [`pulumi destroy`](https://www.pulumi.com/docs/reference/cli/pulumi_destroy/) to avoid incurring any costs. Select `yes` on the confirmation prompt so Pulumi will remove all of the resources that you've created. To delete the stack itself, run [`pulumi stack rm`](https://www.pulumi.com/docs/reference/cli/pulumi_stack_rm/). Note that this command deletes all deployment history from the Pulumi console, unless you've explicitly [chosen a different backend](https://www.pulumi.com/docs/intro/concepts/state/) for storing your infrastructure state.
