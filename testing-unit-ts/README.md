# Unit Testing Pulumi programs in TypeScript

An example of writing mock-based unit tests with both infrastructure definition and tests written in TypeScript. The example uses the [Mocha](https://mochajs.org/) test framework to define and run the tests.

## Prerequisites

1. [Ensure you have the latest Node.js and NPM](https://nodejs.org/en/download/).
2. [Install the Mocha test framework](https://mochajs.org/#installation).

## Running the tests

1.  Restore NPM dependencies:

    ```
    $ npm install
    ```

2.  Run the tests:

    ``` 
    $ mocha -r ts-node/register ec2tests.ts

    Infrastructure
      #server
        ✓ must have a name tag
        ✓ must not use userData (use an AMI instead)
      #group
        ✓ must not open port 22 (SSH) to the Internet

    3 passing (420ms)
    ```
