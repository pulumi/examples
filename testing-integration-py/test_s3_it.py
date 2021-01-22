import unittest
from pulumi.x import automation as auto
import os

from resource_s3 import BUCKET_NAME, OUTPUT_KEY_BUCKET_NAME, OUTPUT_KEY_REGION, OUTPUT_KEY_DOMAIN_NAME


class TestS3(unittest.TestCase):

    @classmethod
    def setUpClass(cls) -> None:
        cls.STACK_NAME = 'dev'
        cls.REGION_NAME = 'eu-north-1'
        cls.WORK_DIR = os.path.join(os.path.dirname(__file__))

        cls.stack = auto.create_or_select_stack(stack_name=cls.STACK_NAME, work_dir=cls.WORK_DIR)
        cls.stack.set_config("aws:region", auto.ConfigValue(value=cls.REGION_NAME))
        cls.stack.up(on_output=print)
        cls.outputs = cls.stack.outputs()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.stack.destroy(on_output=print)

    def test_s3_region(self):
        bucket_region = self.outputs.get(OUTPUT_KEY_REGION)

        self.assertEqual(self.REGION_NAME, bucket_region)

    def test_s3_bucket_name(self):
        bucket_name_output = self.outputs.get(OUTPUT_KEY_BUCKET_NAME)
        self.assertIn(BUCKET_NAME, bucket_name_output)

    def test_s3_connect(self):
        pass


if __name__ == '__main__':
    unittest.main()
