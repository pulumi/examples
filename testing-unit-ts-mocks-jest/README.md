# Unit testing AWS infrastructure with Jest

An example of using [Pulumi](https://pulumi.com/) with [Jest](https://jestjs.io/), the JavaScript testing framework, to write in-memory unit tests that mock AWS infrastructure. The program under test deploys a single [AWS Lambda function](https://aws.amazon.com/lambda/) and an associated [Lambda Function URL](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html).

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Running the tests

1. Create a new [stack](https://www.pulumi.com/docs/intro/concepts/stack/) for the project:

   ```bash
   pulumi stack init
   ```

2. Specify an AWS region to deploy into:

   ```bash
   pulumi config set aws:region us-west-2
   ```

3. Install dependencies and run the tests:

   ```bash
   npm install
   npm test
   ```

   In a few moments, the tests should pass.

4. If you'd like to deploy the program as well, run `pulumi up`. In a few moments, the `FunctionUrl` of the `timeURL` Lambda will be emitted as a Pulumi [stack output](https://www.pulumi.com/docs/intro/concepts/stack/#outputs) called `audioURL`:

   ```
   Outputs:
       audioURL: "https://o3vbc73qd2vxrhtaao5v53yeaa0sricr.lambda-url.us-west-2.on.aws/"
   ```

5. When you're ready, destroy your stack and remove it:

   ```bash
   pulumi destroy --yes
   pulumi stack rm --yes
   ```

## Learn more

Learn more about testing Pulumi programs:

- [Testing Guide](https://www.pulumi.com/docs/iac/guides/testing/)
- [Unit Testing Guide](https://www.pulumi.com/docs/iac/guides/testing/unit/)
