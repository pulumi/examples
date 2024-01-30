[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/testing-integration-py/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/testing-integration-py/README.md#gh-dark-mode-only)

# Integration Testing of Pulumi programs in Python

This integration test is using Pulumi [Automation API](https://www.pulumi.com/blog/automation-api/) and [Python Unittest](https://docs.python.org/3/library/unittest.html)  to simulate integration test in Pulumi without native python integration library.

| UnitTest | Integration Test |Target|
|--|--|--|
| YES | YES|Input|
| No | YES|Output|

## Test Case
To create a s3 bucket and upload a file

 1. Create the stack with a bucket
 3. Verify S3 bucket name and region in Output
 4. Using client to check the S3 name again
 5. Using client to upload a file
 6. Deleting that file
 7. Delete the stack with the bucket


## Precondition

You need to create the credential file yourself. By default, its location is at ~/.aws/credentials. Your access key needs the correct permissions for S3 bucket and object creation/deletion.
```
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
```

##  Running the tests
```
pip install -r requirements.txt
python -m unittest test_s3_it.py
```

## Test Life Cycle
 - Create a stack and export the desired outputs.
 - Validate any output values you defined in advance.
 - In the end, don't forget to destroy the stack.
```
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
## Further steps

Learn more about testing Pulumi programs and Automation API:

 - [Automation API](https://www.pulumi.com/blog/automation-api/)
 - [Pulumi Test](https://www.pulumi.com/docs/guides/testing/)
