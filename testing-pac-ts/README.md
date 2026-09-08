# Writing policies for testing Pulumi programs

An example of writing tests based on [Policy as Code ("CrossGuard")](https://www.pulumi.com/docs/guides/crossguard/) with both infrastructure definition and tests written in TypeScript.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Running the tests

The tests will run while Pulumi deploys the code, right before the deployment of each resource.

1.  Install dependencies:

    ```bash
    npm install
    ```

2.  Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init
    ```

3.  Set the AWS region for this program:

    ```bash
    pulumi config set aws:region us-west-2
    ```

4.  Run `pulumi up` with the `tests` folder as the policy pack:

    ```bash
    pulumi up --policy-pack tests
    ```

    The preview displays that the Policy Pack will run:

    ```
    Policy Packs run:
    Name                Version
    tests-pack (tests)  (local)
    ```

    Confirm the preview with `yes` and watch the deployment happen with tests running in parallel. If a test fails, the deployment will stop.

5.  Tear down your stack's resources by destroying and removing it:

    ```bash
    pulumi destroy --yes
    pulumi stack rm --yes
    ```

## Learn more

Learn more about testing Pulumi programs:

- [Testing Guide](https://www.pulumi.com/docs/iac/guides/testing/)
- [Property Testing Guide](https://www.pulumi.com/docs/iac/guides/testing/property-testing/)
