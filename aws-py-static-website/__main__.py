import json
import mimetypes
import os

from pulumi import export, FileAsset, ResourceOptions, Config, Output
import pulumi_aws
import pulumi_aws.acm
import pulumi_aws.cloudfront
import pulumi_aws.config
import pulumi_aws.route53
import pulumi_aws.s3

def get_domain_and_subdomain(domain):
    parts = domain.split('.')
    if len(parts) < 2:
        raise Exception(f'No TLD found on ${domain}')
    if len(parts) == 2:
        return "", domain
    subdomain = parts[0]
    parts.pop(0)
    return subdomain, '.'.join(parts) + '.'

stack_config = Config('static-website')
target_domain = stack_config.require('targetDomain')
path_to_website_contents = stack_config.require('pathToWebsiteContents')
certificate_arn = stack_config.get('certificateArn')

content_bucket = pulumi_aws.s3.Bucket('contentBucket',
    bucket=target_domain,
    acl='public-read',
    website={
        'index_document': 'index.html',
        'error_document': '404.html'
    })

def crawl_directory(content_dir, f):
    for file in os.listdir(content_dir):
        filepath = os.path.join(content_dir, file)

        if os.path.isdir(filepath):
            crawl_directory(filepath, f)
        elif os.path.isfile(filepath):
            f(filepath)

web_contents_root_path = os.path.join(os.getcwd(), path_to_website_contents)
def bucket_object_converter(filepath):
    relative_path = filepath.replace(web_contents_root_path + '/', '')
    mime_type, _ = mimetypes.guess_type(filepath)
    content_file = pulumi_aws.s3.BucketObject(
        relative_path,
        key=relative_path,
        acl='public-read',
        bucket=content_bucket,
        content_type=mime_type,
        source=FileAsset(filepath),
        opts=ResourceOptions(parent=content_bucket)
    )

crawl_directory(web_contents_root_path, bucket_object_converter)

logs_bucket = pulumi_aws.s3.Bucket('requestLogs', bucket=f'{target_domain}-logs', acl='private')

TEN_MINUTES = 60 * 10

# provision a certificate if the arn is not provided
if (certificate_arn is None):
    east_region = pulumi_aws.Provider('east', profile=pulumi_aws.config.profile, region='us-east-1')
    certificate = pulumi_aws.acm.Certificate('certificate',
        domain_name=target_domain, validation_method='DNS', opts=ResourceOptions(provider=east_region))

    subdomain, parent_domain = get_domain_and_subdomain(target_domain)
    hzid = pulumi_aws.route53.get_zone(name=parent_domain).id

    # create a record to prove we own the domain
    cert_validation_domain = pulumi_aws.route53.Record(f'{target_domain}-validation',
        name=certificate.domain_validation_options.apply(
            lambda o: o[0]['resourceRecordName']),
        zone_id=hzid,
        type=certificate.domain_validation_options.apply(
            lambda o: o[0]['resourceRecordType']),
        records=[certificate.domain_validation_options.apply(
            lambda o: o[0]['resourceRecordValue'])],
        ttl=TEN_MINUTES)

    # special resource to await complete validation of the cert
    cert_validation = pulumi_aws.acm.CertificateValidation('certificateValidation',
        certificate_arn=certificate.arn,
        validation_record_fqdns=[cert_validation_domain.fqdn],
        opts=ResourceOptions(provider=east_region))

    certificate_arn = cert_validation.certificate_arn

cdn = pulumi_aws.cloudfront.Distribution('cdn',
    enabled=True,
    aliases=[
        target_domain
    ],
    origins=[{
        'originId': content_bucket.arn,
        'domain_name': content_bucket.website_endpoint,
        'customOriginConfig': {
            'originProtocolPolicy': 'http-only',
            'httpPort': 80,
            'httpsPort': 443,
            'originSslProtocols': ['TLSv1.2'],
        }
    }],
    default_root_object='index.html',
    default_cache_behavior={
        'targetOriginId': content_bucket.arn,
        'viewerProtocolPolicy': 'redirect-to-https',
        'allowedMethods': ['GET', 'HEAD', 'OPTIONS'],
        'cachedMethods': ['GET', 'HEAD', 'OPTIONS'],
        'forwardedValues': {
            'cookies': { 'forward': 'none' },
            'queryString': False,
        },
        'minTtl': 0,
        'defaultTtl': TEN_MINUTES,
        'maxTtl': TEN_MINUTES,
    },
    price_class= 'PriceClass_100',
    custom_error_responses=[{
            'errorCode': 404,
            'responseCode': 404,
            'responsePagePath': '/404.html'
        }],
    viewer_certificate={
        'acmCertificateArn': certificate_arn,
        'sslSupportMethod': 'sni-only',
    },
    restrictions={
        'geoRestriction': {
            'restrictionType': 'none'
        }
    },
    logging_config={
        'bucket': logs_bucket.bucket_domain_name,
        'includeCookies': False,
        'prefix': f'${target_domain}/',
    },
    wait_for_deployment=False)

def create_alias_record(target_domain, distribution):
    subdomain, parent_domain = get_domain_and_subdomain(target_domain)
    hzid = pulumi_aws.route53.get_zone(name=parent_domain).id
    return pulumi_aws.route53.Record(target_domain,
        name=subdomain,
        zone_id=hzid,
        type='A',
        aliases=[
            {
                'name': distribution.domain_name,
                'zoneId': distribution.hosted_zone_id,
                'evaluateTargetHealth': True
            }
        ]
    )

alias_a_record = create_alias_record(target_domain, cdn)

# Export the name of the bucket
export('content_bucket_url', Output.concat('s3://', content_bucket.bucket))
export('content_bucket_website_endpoint', content_bucket.website_endpoint)
export('cloudfront_domain', cdn.domain_name)
export('target_domain_endpoint', f'https://{target_domain}/')
