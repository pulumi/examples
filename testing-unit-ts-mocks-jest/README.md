[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/testing-unit-ts-mocks-jest/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/testing-unit-ts-mocks-jest/README.md#gh-dark-mode-only)

# Unit Testing AWS Infrastructure with Jest

An example of using [Pulumi](https://pulumi.com/) with [Jest](https://jestjs.io/), the JavaScript testing framework, to write in-memory unit tests that mock AWS infrastructure. The program under test deploys a single [AWS Lambda function](https://aws.amazon.com/lambda/) and an associated [Lambda Function URL](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html).

[![Deploy with Pulumi](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/tree/master/testing-unit-ts-mocks-jest)

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/).
1. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/).
1. Configure your [AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/).

### Deploying the App

1. Clone this repo, change to this directory, then create a new [stack](https://www.pulumi.com/docs/intro/concepts/stack/) for the project:

    ```bash
    pulumi stack init
    ```

1. Specify an AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-west-2
    ```

1. Install Node dependencies and run the tests:

    ```bash
    npm install
    npm test
    ```

    In a few moments, the tests should pass.

1. If you'd like to deploy the program as well, run `pulumi up`. In a few moments, the `FunctionUrl` of the `timeURL` Lambda will be emitted as a Pulumi [stack output](https://www.pulumi.com/docs/intro/concepts/stack/#outputs) called `audioURL`:

    ```bash
    ...
    Outputs:
        audioURL: "https://o3vbc73qd2vxrhtaao5v53yeaa0sricr.lambda-url.us-west-2.on.aws/"
    ```

1. When you're ready, destroy your stack and remove it:

    ```bash
    pulumi destroy --yes
    pulumi stack rm --yes
    ```
