[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/testing-unit-ts/mocha/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/testing-unit-ts/mocha/README.md#gh-dark-mode-only)

# Unit Testing Pulumi programs in TypeScript

An example of writing mock-based unit tests with both infrastructure definition and tests written in TypeScript. The example uses the [Mocha](https://mochajs.org/) test framework to define and run the tests.

## Prerequisites

[Ensure you have the latest Node.js and NPM](https://nodejs.org/en/download/).

## Running the tests

1.  Restore NPM dependencies:

    ```
    $ npm install
    ```

2.  Run the tests, with `mocha` installed locally in `node_modules/`:

    ```
    $ npx mocha -r ts-node/register ec2tests.ts

    Infrastructure
      #server
        ✓ must have a name tag
        ✓ must not use userData (use an AMI instead)
      #group
        ✓ must not open port 22 (SSH) to the Internet

    3 passing (420ms)
    ```

## Further steps

Learn more about testing Pulumi programs:

- [Testing Guide](https://www.pulumi.com/docs/guides/testing/)
- [Unit Testing Guide](https://www.pulumi.com/docs/guides/testing/unit/)
