# Copyright 2016-2021, Pulumi Corporation.
import pulumi
from pulumi.resource import ResourceOptions
import pulumi_aws as aws


def configure_dns(domain: str, zone_id: pulumi.Input):
    # SSL Cert must be created in us-east-1 unrelated to where the API is deployed.
    aws_us_east_1 = aws.Provider("aws-provider-us-east-1", region="us-east-1")
    # Request ACM certificate
    ssl_cert = aws.acm.Certificate("ssl-cert",
                                   domain_name=domain,
                                   validation_method="DNS",
                                   opts=ResourceOptions(provider=aws_us_east_1))
    # Create DNS record to prove to ACM that we own the domain
    ssl_cert_validation_dns_record = aws.route53.Record("ssl-cert-validation-dns-record",
                                                        zone_id=zone_id,
                                                        name=ssl_cert.domain_validation_options.apply(
                                                            lambda options: options[0].resource_record_name),
                                                        type=ssl_cert.domain_validation_options.apply(
                                                            lambda options: options[0].resource_record_type),
                                                        records=[ssl_cert.domain_validation_options.apply(
                                                            lambda options: options[0].resource_record_value)],
                                                        ttl=10*60)
    # Wait for the certificate validation to succeed
    validated_ssl_certificate = aws.acm.CertificateValidation("ssl-cert-validation",
                                                              certificate_arn=ssl_cert.arn,
                                                              validation_record_fqdns=[ssl_cert_validation_dns_record.fqdn],
                                                              opts=ResourceOptions(provider=aws_us_east_1))
    # Configure API Gateway to be able to use domain name & certificate
    api_domain_name = aws.apigateway.DomainName("api-domain-name",
                                                certificate_arn=validated_ssl_certificate.certificate_arn,
                                                domain_name=domain)
    # Create DNS record
    aws.route53.Record("api-dns",
                       zone_id=zone_id,
                       type="A",
                       name=domain,
                       aliases=[aws.route53.RecordAliasArgs(
                           name=api_domain_name.cloudfront_domain_name,
                           evaluate_target_health=False,
                           zone_id=api_domain_name.cloudfront_zone_id)])
    return api_domain_name
