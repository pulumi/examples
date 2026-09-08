# Unit testing Pulumi programs in TypeScript

An example of writing mock-based unit tests with both infrastructure definition and tests written in TypeScript. The example uses the [Mocha](https://mochajs.org/) test framework to define and run the tests.

## Running the tests

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the tests, with `mocha` installed locally in `node_modules/`:

   ```bash
   npx mocha -r ts-node/register ec2tests.ts
   ```

   ```
   Infrastructure
     #server
       ✓ must have a name tag
       ✓ must not use userData (use an AMI instead)
     #group
       ✓ must not open port 22 (SSH) to the Internet

   3 passing (420ms)
   ```

## Learn more

Learn more about testing Pulumi programs:

- [Testing Guide](https://www.pulumi.com/docs/iac/guides/testing/)
- [Unit Testing Guide](https://www.pulumi.com/docs/iac/guides/testing/unit/)
