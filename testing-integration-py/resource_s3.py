import pulumi
from pulumi_aws import s3

BUCKET_NAME = 'pulumi-it-bucket'
OUTPUT_KEY_BUCKET_NAME = 'bucket_name'
OUTPUT_KEY_REGION = 'region'


def create_s3_bucket():
    # Create an AWS resource (S3 Bucket)
    bucket = s3.Bucket(BUCKET_NAME)

    # Export the value of the bucket
    pulumi.export(OUTPUT_KEY_BUCKET_NAME, bucket.bucket)
    pulumi.export(OUTPUT_KEY_REGION, bucket.region)

    return bucket
