[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/testing-pac-ts/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/testing-pac-ts/README.md#gh-dark-mode-only)

# Writing Policies for Testing Pulumi Programs

An example of writing tests based on [Policy as Code ("CrossGuard")](https://www.pulumi.com/docs/guides/crossguard/) with both infrastructure definition and tests written in TypeScript.

## Prerequisites

1. [Ensure you have the latest Node.js and NPM](https://nodejs.org/en/download/).
2. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/).
3. [Configure Pulumi to Use AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/) (if your AWS CLI is configured, no further changes are required).


## Running the tests

The tests will run while Pulumi deploys the code, right before the deployment of each resource.

1.  Restore NPM dependencies:

    ```
    $ npm install
    ```

2. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```

3. Set the AWS region for this program:

    ```bash
    $ pulumi config set aws:region us-west-2
    ```

4.  Run `pulumi up` with `tests` folder as policy:

    ```
    $ pulumi up --policy-pack tests
    ```

    The preview displays that Policy Pack will run:

    ```
    Policy Packs run:
    Name                Version
    tests-pack (tests)  (local)
    ```

    Confirm the preview with `yes` and watch the deployment happen with tests running in parallel. If a test fails, the deployment will stop.

5. Tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```

## Further steps

Learn more about testing Pulumi programs:

- [Testing Guide](https://www.pulumi.com/docs/guides/testing/)
- [Property Testing Guide](https://www.pulumi.com/docs/guides/testing/property-testing/)
