
# Integration Testing of Pulumi programs in Python

This integration test is using Pulumi automation api [Automation API](https://www.pulumi.com/blog/automation-api/) and [Python Unittest](https://docs.python.org/3/library/unittest.html)  to simulate integration test in Pulumi without native python integration library. 

| UnitTest | Integration Test |Target|
|--|--|--|
| YES | YES|Input|
| No | YES|Output|



## Test Case
To create a s3 bucket and upload a html file, 

 1. Create the stack with a bucket
 3. Verfiy S3 bucket name and regaion in Output
 4. Using client to check the S3 name agaion
 5. Using client to upload a file
 6. Deleting that file
 7. Delete the stack with the bucket


## Precondition

you meed create the credential file yourself. By default, its location is at ~/.aws/credentials, and And access key has the permission for S3 bucket.
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
Firslty, to create a stack for all the use cases, we can get all the output from stack, then you can assert any output value you defined in advance. In the end, don't forget destory the stack. 
```
from pulumi.x import automation as auto

class TestS3(unittest.TestCase):  
  
    @classmethod  
  def setUpClass(cls) -> None:  
      ....
        cls.stack = auto.create_or_select_stack(stack_name=cls.STACK_NAME, work_dir=cls.WORK_DIR)  
       ...
          
    @classmethod  
  def tearDownClass(cls) -> None:  
        cls.stack.destroy(on_output=print)  
  
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
