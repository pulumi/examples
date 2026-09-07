[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-containers/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-containers/README.md#gh-dark-mode-only)

# Easy container example

Companion to the tutorial [Provision containers on AWS](https://www.pulumi.com/docs/tutorials/aws/ecs-fargate/).

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
4. [Install Docker](https://docs.docker.com/engine/installation/) and make sure it is running

## Deploying the example

Note: some values in this example will be different from run to run. These values are indicated with `***`.

1.  Create a new stack:

    ```bash
    pulumi stack init containers-dev
    ```

1.  Configure Pulumi to use an AWS region that supports Fargate (you can view a list of supported regions in the [AWS documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate-Regions.html)):

    ```bash
    pulumi config set aws:region us-west-2
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Deploy the stack. The preview will take a few minutes, as it builds a Docker container. A total of 19 resources are created.

    ```bash
    pulumi up
    ```

1.  View the endpoint URL, and run curl:

    ```bash
    pulumi stack output
    ```

    ```
    Current stack outputs (1)
        OUTPUT                  VALUE
        hostname                http://***.elb.us-west-2.amazonaws.com
    ```

    ```bash
    curl $(pulumi stack output hostname)
    ```

    ```
    <html>
        <head><meta charset="UTF-8">
        <title>Hello, Pulumi!</title></head>
    <body>
        <p>Hello, S3!</p>
        <p>Made with ❤️ with <a href="https://pulumi.com">Pulumi</a></p>
    </body></html>
    ```

1.  To view the runtime logs from the container, use the `pulumi logs` command. To get a log stream, use `pulumi logs --follow`.

    ```bash
    pulumi logs --follow
    ```

    ```
    Collecting logs for stack aws-ts-containers-dev since 2018-05-22T14:25:46.000-07:00.
    2018-05-22T15:33:22.057-07:00[                  pulumi-nginx] 172.31.13.248 - - [22/May/2018:22:33:22 +0000] "GET / HTTP/1.1" 200 189 "-" "curl/7.54.0" "-"
    ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring further charges:

```bash
pulumi destroy
pulumi stack rm
```
