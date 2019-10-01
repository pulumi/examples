import json
import mimetypes
import os
import Exception

from pulumi import export, FileAsset, Config, ResourceOptions
from pulumi_aws import s3, config, acm, Provider, route53, cloudfront

config_details = Config()
target_domain = config_details.require("target_domain")
certificate_arn = config_details.get("certificate_arn") or ""

web_bucket = s3.Bucket('s3-website-bucket', website={
    "index_document": "index.html"
})

content_dir = "www"
for file in os.listdir(content_dir):
    filepath = os.path.join(content_dir, file)
    mime_type, _ = mimetypes.guess_type(filepath)
    obj = s3.BucketObject(file,
        bucket=web_bucket.id,
        source=FileAsset(filepath),
        content_type=mime_type)

def public_read_policy_for_bucket(bucket_name):
    return json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": "*",
            "Action": [
                "s3:GetObject"
            ],
            "Resource": [
                f"arn:aws:s3:::{bucket_name}/*",
            ]
        }]
    })

bucket_name = web_bucket.id
bucket_policy = s3.BucketPolicy("bucket-policy",
    bucket=bucket_name,
    policy=bucket_name.apply(public_read_policy_for_bucket))


if not certificate_arn:
    east_region = Provider(
        "east",
        profile=config.profile,
        region="us-east-1" ## ACM Certificates must be created in us-east-1
    )

    certificate = acm.Certificate(
        "certificate",
        domain_name=target_domain,
        validate_method="DNS",
        __opts__=ResourceOptions(provider=east_region)
    )

    domain_parts = target_domain.split('.')
    if len(domain_parts) < 3:
        raise Exception('No TLD found on %s' % target_domain)

    parent_domain = domain_parts[1] + "." + domain_parts[2] + "." ## canonicalize the domain

    hosted_zone_id = route53.getZone(
        name=parent_domain
    )

    certificate_validation_domain = route53.Record(
        "%s-validation" % target_domain,
        name=certificate.domain_validation_options[0].resource_record_name,
        zone_id=hosted_zone_id,
        type=certificate.domain_validation_options[0].resource_record_type,
        records=[certificate.domain_validation_options[0].resource_record_value],
        ttl=600
    )

    certificate_validation = acm.CertificateValidation(
        "certificate-validation",
        certificate_arn=certificate.arn,
        validation_record_fqdns=[certificate_validation_domain.fqdn],
        __opts__=ResourceOptions(provider=east_region)
    )

    certificate_arn = certificate_validation.certificate_arn

cdn = cloudfront.Distribution(
    "cdn",
    enabled="true",
    aliases=[target_domain],
    origins=[{
        "origin_id": web_bucket.arn,
        "domain_name": web_bucket.website_endpoint,
        "custom_origin_config": {
            "origin_protocol_policy": "http-only",
            "http_port": 80,
            "https_port": 443,
            "origin_ssl_protocols": ["TLSv1.2"]
        },
    }],
    default_root_object="index.html",
    default_cache_behaviour={
        "target_origin_id": web_bucket.arn,
        "viewer_protocol_proxy": "redirect-to-https",
        "allowed_methods": ["GET", "HEAD", "OPTIONS"],
        "cached_methods": ["GET", "HEAD", "OPTIONS"],
        "forwared_values": {
            "cookies": {
                "forward": "none",
            },
            "query_string": "false",
        },
        "min_ttl": 0,
        "default_ttl": 600,
        "max_ttl": 600,
    },
    price_class="PriceClass_100",
    restrictions={
        "geo_restriction": {
            "restriction_type": "none",
        },
    },
    viewer_certificate={
        "acm_certificate": certificate_arn,
        "ssl_support_method": "sni-only",
    },
)

# Export the name of the bucket
export('bucket_name',  web_bucket.id)
export('website_url', web_bucket.website_endpoint)
export("cloudFrontDomain", cdn.domain_name)
