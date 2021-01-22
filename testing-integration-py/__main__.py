"""An AWS Python Pulumi program"""

from resource_s3 import create_s3_bucket

bucket = create_s3_bucket()
