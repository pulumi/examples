import json
import mimetypes
import os

from pulumi import FileAsset, Output, export, ResourceOptions
from pulumi_aws import s3

web_bucket = s3.Bucket('s3-website-bucket',
    website=s3.BucketWebsiteArgs(
        index_document="index.html",
    ))

public_access_block = s3.BucketPublicAccessBlock(
    'public-access-block', 
    bucket=web_bucket.id, 
    block_public_acls=False)

content_dir = "www"
for file in os.listdir(content_dir):
    filepath = os.path.join(content_dir, file)
    mime_type, _ = mimetypes.guess_type(filepath)
    obj = s3.BucketObject(file,
        bucket=web_bucket.id,
        source=FileAsset(filepath),
        content_type=mime_type)

def public_read_policy_for_bucket(bucket_name):
    return Output.json_dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": "*",
            "Action": [
                "s3:GetObject"
            ],
            "Resource": [
                Output.format("arn:aws:s3:::{0}/*", bucket_name),
            ]
        }]
    })

bucket_name = web_bucket.id
bucket_policy = s3.BucketPolicy("bucket-policy",
    bucket=bucket_name,
    policy=public_read_policy_for_bucket(bucket_name), 
    opts=ResourceOptions(depends_on=[public_access_block]))

# Export the name of the bucket
export('bucket_name', web_bucket.id)
export('website_url', web_bucket.website_endpoint)
