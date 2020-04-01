# Unit Testing Pulumi programs in Python

An example of writing mock-based unit tests with both infrastructure definition and tests written in Python. The example uses the [unittest](https://docs.python.org/3/library/unittest.html) test framework to define and run the tests.

## Running the tests

1. Create a Python virtualenv, activate it, and install dependencies:

   ```bash
   $ python3 -m venv venv
   $ source venv/bin/activate
   $ pip3 install -r requirements.txt
   ```

2.  Run the tests:

    ``` 
    $ python -m unittest

    ------------------------------------------------------------
    Ran 2 tests in 0.004s

    OK
    ```
