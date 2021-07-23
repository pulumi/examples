import os
import unittest

import boto3
from pulumi import automation as auto

from resource_s3 import BUCKET_NAME, OUTPUT_KEY_BUCKET_NAME, OUTPUT_KEY_REGION


class TestS3(unittest.TestCase):

    @classmethod
    def setUpClass(cls) -> None:
        cls.STACK_NAME = 'staging'
        cls.REGION_NAME = 'eu-north-1'
        cls.WORK_DIR = os.path.join(os.path.dirname(__file__))
        cls.FILE_NAME = 'bucket.txt'

        cls.stack = auto.create_or_select_stack(stack_name=cls.STACK_NAME, work_dir=cls.WORK_DIR)
        cls.stack.set_config("aws:region", auto.ConfigValue(value=cls.REGION_NAME))
        cls.stack.up(on_output=print)
        cls.outputs = cls.stack.outputs()
        cls.s3 = boto3.resource('s3')

    @classmethod
    def tearDownClass(cls) -> None:
        cls.stack.destroy(on_output=print)
        cls.stack.workspace.remove_stack(cls.STACK_NAME)

    def test_s3_output_region(self):
        bucket_region = self.outputs.get(OUTPUT_KEY_REGION)
        self.assertEqual(self.REGION_NAME, bucket_region.value)

    def test_s3_output_name(self):
        bucket_name_output = self.outputs.get(OUTPUT_KEY_BUCKET_NAME)
        self.assertIn(BUCKET_NAME, bucket_name_output.value)

    def test_s3_exist(self):
        buckets = self.s3.buckets.all()
        bucket_names = []
        for bucket in buckets:
            bucket_names.append(bucket.name)
        output_bucket_name = self.outputs.get(OUTPUT_KEY_BUCKET_NAME).value
        self.assertIn(output_bucket_name, bucket_names)

    def test_s3_create_permission(self):
        output_bucket_name = self.outputs.get(OUTPUT_KEY_BUCKET_NAME).value
        created_response = self.s3.Bucket(output_bucket_name).put_object(Key=self.FILE_NAME, Body='Hi')
        self.assertEqual(created_response.key, self.FILE_NAME)

    def test_s3_delete_permission(self):
        output_bucket_name = self.outputs.get(OUTPUT_KEY_BUCKET_NAME).value
        delete_response = self.s3.meta.client.delete_object(Bucket=output_bucket_name, Key=self.FILE_NAME)
        self.assertIsNotNone(delete_response)


if __name__ == '__main__':
    unittest.main()
