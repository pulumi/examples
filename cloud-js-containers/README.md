[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/cloud-js-containers/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/cloud-js-containers/README.md#gh-dark-mode-only)

# Containerized App

Companion to the tutorial [Provision containers on AWS](https://www.pulumi.com/docs/tutorials/aws/ecs-fargate/).

## Prerequisites

To run this example, make sure [Docker](https://docs.docker.com/engine/installation/) is installed and running.

## Running the App

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1.  Create a new stack:

    ```
    $ pulumi stack init containers-dev
    ```

1.  Configure Pulumi to use AWS Fargate, which is currently only available in `us-east-1`, `us-east-2`, `us-west-2`, and `eu-west-1`:

    ```
    $ pulumi config set aws:region us-west-2
    $ pulumi config set cloud-aws:useFargate true
    ```

1.  Restore NPM modules via `npm install` or `yarn install`.

1.  Preview and deploy the app via `pulumi up`. The preview will take a few minutes, as it builds a Docker container. A total of 19 resources are created.

    ```
    $ pulumi up
    ```

1.  View the endpoint URL, and run curl:

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

1.  To view the runtime logs from the container, use the `pulumi logs` command. To get a log stream, use `pulumi logs --follow`.

    ```
    $ pulumi logs --follow
    Collecting logs for stack cloud-js-containers-dev since 2018-05-22T14:25:46.000-07:00.
    2018-05-22T15:33:22.057-07:00[                  pulumi-nginx] 172.31.13.248 - - [22/May/2018:22:33:22 +0000] "GET / HTTP/1.1" 200 189 "-" "curl/7.54.0" "-"
    ```

## Clean up

To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
