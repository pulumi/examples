[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/testing-unit-py/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/testing-unit-py/README.md#gh-dark-mode-only)

# Unit Testing Pulumi programs in Python

An example of writing mock-based unit tests with both infrastructure definition and tests written in Python. The example uses the [unittest](https://docs.python.org/3/library/unittest.html) test framework to define and run the tests.

## Running the tests

1. Create a Python virtualenv, activate it, and install dependencies:

   ```bash
   $ python3 -m venv venv
   $ source venv/bin/activate
   $ python -m pip install --upgrade pip
   $ python -m pip install -r requirements.txt
   ```

2.  Run the tests:

    ```
    $ python -m pytest --disable-pytest-warnings # or simply `pytest --disable-pytest-warnings`

    ====================================================================================================== 3 passed, 6 warnings in 0.76s =======================================================================================================

    ```

## Further steps

Learn more about testing Pulumi programs:

- [Testing Guide](https://www.pulumi.com/docs/guides/testing/)
- [Unit Testing Guide](https://www.pulumi.com/docs/guides/testing/unit/)
