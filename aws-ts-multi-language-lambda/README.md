# Building and bundling Lambda dependencies

This example shows how to install dependencies and build multiple Lambda functions in different languages and then deploy the results.

## Deploying the Lambda functions

To deploy the infrastructure, follow the steps below:

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Install NodeJS](https://www.pulumi.com/docs/clouds/aws/get-started/begin/#install-language-runtime)
1. [Install Docker](https://docs.docker.com/engine/install/)
1. [Configure AWS Credentials](https://www.pulumi.com/docs/clouds/aws/get-started/begin/#configure-pulumi-to-access-your-aws-account)

You don't need to install any languages other than NodeJS because we'll use Docker containers to build the code.

### Steps

1. Clone this repo: `git clone https://github.com/pulumi/examples`
1. Change directory to the correct folder: `cd examples/aws-ts-multi-language-lambda`
1. Install all required packages: `pulumi install`
1. Run `pulumi up`

Once all the resources have deployed, you can run the lambdas and see the outputs.

Don't forget to run `pulumi destroy` when you're done to delete the resources.