# Unit testing Pulumi programs in Python

An example of writing mock-based unit tests with both infrastructure definition and tests written in Python. The example uses the [unittest](https://docs.python.org/3/library/unittest.html) test framework to define and run the tests.

## Running the tests

1. Create a Python virtualenv, activate it, and install dependencies:

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   python -m pip install --upgrade pip
   python -m pip install -r requirements.txt
   ```

2.  Run the tests:

   ```bash
   python -m unittest -v
   ```

## Learn more

Learn more about testing Pulumi programs:

- [Testing Guide](https://www.pulumi.com/docs/iac/guides/testing/)
- [Unit Testing Guide](https://www.pulumi.com/docs/iac/guides/testing/unit/)
