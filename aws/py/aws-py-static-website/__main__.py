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
    """
    Returns the subdomain and the parent domain.
    """

    parts = domain.split('.')
    if len(parts) < 2:
        raise Exception(f'No TLD found on ${domain}')
    if len(parts) == 2:
        return '', domain
    subdomain = parts[0]
    parts.pop(0)
    return subdomain, '.'.join(parts) + '.'

# Read the configuration for this stack.
stack_config = Config()
target_domain = stack_config.require('targetDomain')
path_to_website_contents = stack_config.require('pathToWebsiteContents')
certificate_arn = stack_config.get('certificateArn')

# Create an S3 bucket configured as a website bucket.
content_bucket = pulumi_aws.s3.Bucket('contentBucket',
    bucket=target_domain,
    acl='public-read',
    website=pulumi_aws.s3.BucketWebsiteArgs(
        index_document='index.html',
        error_document='404.html'
    ))

def crawl_directory(content_dir, f):
    """
    Crawl `content_dir` (including subdirectories) and apply the function `f` to each file.
    """
    for file in os.listdir(content_dir):
        filepath = os.path.join(content_dir, file)

        if os.path.isdir(filepath):
            crawl_directory(filepath, f)
        elif os.path.isfile(filepath):
            f(filepath)

web_contents_root_path = os.path.join(os.getcwd(), path_to_website_contents)
def bucket_object_converter(filepath):
    """
    Takes a file path and returns an bucket object managed by Pulumi
    """
    relative_path = filepath.replace(web_contents_root_path + '/', '')
    # Determine the mimetype using the `mimetypes` module.
    mime_type, _ = mimetypes.guess_type(filepath)
    content_file = pulumi_aws.s3.BucketObject(
        relative_path,
        key=relative_path,
        acl='public-read',
        bucket=content_bucket.id,
        content_type=mime_type,
        source=FileAsset(filepath),
        opts=ResourceOptions(parent=content_bucket)
    )

# Crawl the web content root path and convert the file paths to S3 object resources.
crawl_directory(web_contents_root_path, bucket_object_converter)

TEN_MINUTES = 60 * 10

# Provision a certificate if the arn is not provided via configuration.
if certificate_arn is None:
    # CloudFront is in us-east-1 and expects the ACM certificate to also be in us-east-1.
    # So, we create an east_region provider specifically for these operations.
    east_region = pulumi_aws.Provider('east', profile=pulumi_aws.config.profile, region='us-east-1')

    # Get a certificate for our website domain name.
    certificate = pulumi_aws.acm.Certificate('certificate',
        domain_name=target_domain, validation_method='DNS', opts=ResourceOptions(provider=east_region))

    # Find the Route 53 hosted zone so we can create the validation record.
    subdomain, parent_domain = get_domain_and_subdomain(target_domain)
    hzid = pulumi_aws.route53.get_zone(name=parent_domain).id

    # Create a validation record to prove that we own the domain.
    cert_validation_domain = pulumi_aws.route53.Record(f'{target_domain}-validation',
        name=certificate.domain_validation_options.apply(
            lambda o: o[0].resource_record_name),
        zone_id=hzid,
        type=certificate.domain_validation_options.apply(
            lambda o: o[0].resource_record_type),
        records=[certificate.domain_validation_options.apply(
            lambda o: o[0].resource_record_value)],
        ttl=TEN_MINUTES)

    # Create a special resource to await complete validation of the cert.
    # Note that this is not a real AWS resource.
    cert_validation = pulumi_aws.acm.CertificateValidation('certificateValidation',
        certificate_arn=certificate.arn,
        validation_record_fqdns=[cert_validation_domain.fqdn],
        opts=ResourceOptions(provider=east_region))

    certificate_arn = cert_validation.certificate_arn

# Create a logs bucket for the CloudFront logs
logs_bucket = pulumi_aws.s3.Bucket('requestLogs', bucket=f'{target_domain}-logs', acl='private')

# Create the CloudFront distribution
cdn = pulumi_aws.cloudfront.Distribution('cdn',
    enabled=True,
    aliases=[
        target_domain
    ],
    origins=[pulumi_aws.cloudfront.DistributionOriginArgs(
        origin_id=content_bucket.arn,
        domain_name=content_bucket.website_endpoint,
        custom_origin_config=pulumi_aws.cloudfront.DistributionOriginCustomOriginConfigArgs(
            origin_protocol_policy='http-only',
            http_port=80,
            https_port=443,
            origin_ssl_protocols=['TLSv1.2'],
        )
    )],
    default_root_object='index.html',
    default_cache_behavior=pulumi_aws.cloudfront.DistributionDefaultCacheBehaviorArgs(
        target_origin_id=content_bucket.arn,
        viewer_protocol_policy='redirect-to-https',
        allowed_methods=['GET', 'HEAD', 'OPTIONS'],
        cached_methods=['GET', 'HEAD', 'OPTIONS'],
        forwarded_values=pulumi_aws.cloudfront.DistributionDefaultCacheBehaviorForwardedValuesArgs(
            cookies=pulumi_aws.cloudfront.DistributionDefaultCacheBehaviorForwardedValuesCookiesArgs(forward='none'),
            query_string=False,
        ),
        min_ttl=0,
        default_ttl=TEN_MINUTES,
        max_ttl=TEN_MINUTES,
    ),
    # PriceClass_100 is the lowest cost tier (US/EU only).
    price_class= 'PriceClass_100',
    custom_error_responses=[pulumi_aws.cloudfront.DistributionCustomErrorResponseArgs(
        error_code=404,
        response_code=404,
        response_page_path='/404.html'
    )],
    # Use the certificate we generated for this distribution.
    viewer_certificate=pulumi_aws.cloudfront.DistributionViewerCertificateArgs(
        acm_certificate_arn=certificate_arn,
        ssl_support_method='sni-only',
    ),
    restrictions=pulumi_aws.cloudfront.DistributionRestrictionsArgs(
        geo_restriction=pulumi_aws.cloudfront.DistributionRestrictionsGeoRestrictionArgs(
            restriction_type='none'
        )
    ),
    # Put access logs in the log bucket we created earlier.
    logging_config=pulumi_aws.cloudfront.DistributionLoggingConfigArgs(
        bucket=logs_bucket.bucket_domain_name,
        include_cookies=False,
        prefix=f'${target_domain}/',
    ),
    # CloudFront typically takes 15 minutes to fully deploy a new distribution.
    # Skip waiting for that to complete.
    wait_for_deployment=False)

def create_alias_record(target_domain, distribution):
    """
    Create a Route 53 Alias A record from the target domain name to the CloudFront distribution.
    """
    subdomain, parent_domain = get_domain_and_subdomain(target_domain)
    hzid = pulumi_aws.route53.get_zone(name=parent_domain).id
    return pulumi_aws.route53.Record(target_domain,
        name=subdomain,
        zone_id=hzid,
        type='A',
        aliases=[
            pulumi_aws.route53.RecordAliasArgs(
                name=distribution.domain_name,
                zone_id=distribution.hosted_zone_id,
                evaluate_target_health=True,
            )
        ]
    )

alias_a_record = create_alias_record(target_domain, cdn)

# Export the bucket URL, bucket website endpoint, and the CloudFront distribution information.
export('content_bucket_url', Output.concat('s3://', content_bucket.bucket))
export('content_bucket_website_endpoint', content_bucket.website_endpoint)
export('cloudfront_domain', cdn.domain_name)
export('target_domain_endpoint', f'https://{target_domain}/')
