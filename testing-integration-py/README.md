# Integration testing of Pulumi programs in Python

This integration test uses the Pulumi [Automation API](https://www.pulumi.com/blog/automation-api/) and [Python unittest](https://docs.python.org/3/library/unittest.html) to simulate an integration test in Pulumi without a native Python integration library.

| UnitTest | Integration Test |Target|
|--|--|--|
| YES | YES|Input|
| No | YES|Output|

## Test case

To create an S3 bucket and upload a file:

 1. Create the stack with a bucket
 3. Verify S3 bucket name and region in Output
 4. Using client to check the S3 name again
 5. Using client to upload a file
 6. Deleting that file
 7. Delete the stack with the bucket

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

You need to create the credentials file yourself. By default, its location is at `~/.aws/credentials`. Your access key needs the correct permissions for S3 bucket and object creation/deletion.

```
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
```

## Running the tests

1. Create a Python virtualenv, activate it, and install dependencies:

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. Run the tests:

   ```bash
   python -m unittest test_s3_it.py
   ```

## Test life cycle

 - Create a stack and export the desired outputs.
 - Validate any output values you defined in advance.
 - In the end, don't forget to destroy the stack.

```python
from pulumi import automation as auto

class TestS3(unittest.TestCase):

    @classmethod
    def setUpClass(cls) -> None:
      ....
        cls.stack = auto.create_or_select_stack(stack_name=cls.STACK_NAME, work_dir=cls.WORK_DIR)
		cls.stack.up(output=print)
        cls.outputs = cls.stack.outputs()
       ...

    @classmethod
    def tearDownClass(cls) -> None:
        cls.stack.destroy(on_output=print)
        cls.stack.workspace.remove_stack(cls.STACK_NAME)

    def test_s3_output_case(self):
    ...
        bucket_region = self.outputs.get(OUTPUT_KEY_REGION)
        self.assertEqual(self.REGION_NAME, bucket_region.value)
        ...

```

## Learn more

Learn more about testing Pulumi programs and the Automation API:

 - [Automation API](https://www.pulumi.com/blog/automation-api/)
 - [Testing Guide](https://www.pulumi.com/docs/iac/guides/testing/)
