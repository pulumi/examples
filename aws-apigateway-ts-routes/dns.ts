// Copyright 2016-2021, Pulumi Corporation.
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function configureDns(domain: string, zoneId: pulumi.Input<string>) {
    // SSL Cert must be created in us-east-1 unrelated to where the API is deployed.
    const awsUsEast1 = new aws.Provider("aws-provider-us-east-1", { region: "us-east-1" });
    // Request ACM certificate
    const sslCertificate = new aws.acm.Certificate(
        "ssl-cert",
        {
            domainName: domain,
            validationMethod: "DNS",
        },
        { provider: awsUsEast1 },
    );
    // Create DNS record to prove to ACM that we own the domain
    const sslCertificateValidationDnsRecord = new aws.route53.Record(
        "ssl-cert-validation-dns-record",
        {
            zoneId: zoneId,
            name: sslCertificate.domainValidationOptions[0].resourceRecordName,
            type: sslCertificate.domainValidationOptions[0].resourceRecordType,
            records: [sslCertificate.domainValidationOptions[0].resourceRecordValue],
            ttl: 10 * 60, // 10 minutes
        },
    );
    // Wait for the certificate validation to succeed
    const validatedSslCertificate = new aws.acm.CertificateValidation(
        "ssl-cert-validation",
        {
            certificateArn: sslCertificate.arn,
            validationRecordFqdns: [sslCertificateValidationDnsRecord.fqdn],
        },
        { provider: awsUsEast1 },
    );
    // Configure API Gateway to be able to use domain name & certificate
    const apiDomainName = new aws.apigateway.DomainName("api-domain-name", {
        certificateArn: validatedSslCertificate.certificateArn,
        domainName: domain,
    });

    // Create DNS record
    // tslint:disable-next-line:no-unused-expression
    new aws.route53.Record("api-dns", {
        zoneId: zoneId,
        type: "A",
        name: domain,
        aliases: [{
            name: apiDomainName.cloudfrontDomainName,
            evaluateTargetHealth: false,
            zoneId: apiDomainName.cloudfrontZoneId,
        }],
    });

    return apiDomainName;
}
