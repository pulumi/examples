// Copyright 2016-2021, Pulumi Corporation.
package main

import (
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/acm"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/apigateway"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/route53"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func configureDns(ctx *pulumi.Context, domain string, zoneId string) (*apigateway.DomainName, error) {
	// SSL Cert must be created in us-east-1 unrelated to where the API is deployed.
	awsUsEast1, err := aws.NewProvider(ctx, "aws-provider-us-east-1", &aws.ProviderArgs{Region: pulumi.String("us-east-1")})
	if err != nil {
		return nil, err
	}
	// Request ACM certificate
	sslCertificate, err := acm.NewCertificate(ctx,
		"ssl-cert",
		&acm.CertificateArgs{
			DomainName:       pulumi.String(domain),
			ValidationMethod: pulumi.String("DNS"),
		},
		pulumi.Provider(awsUsEast1),
	)
	if err != nil {
		return nil, err
	}
	domainValidationOption := sslCertificate.DomainValidationOptions.ApplyT(func(options []acm.CertificateDomainValidationOption) interface{} {
		return options[0]
	})
	// Create DNS record to prove to ACM that we own the domain
	sslCertificateValidationDnsRecord, err := route53.NewRecord(ctx,
		"ssl-cert-validation-dns-record",
		&route53.RecordArgs{
			ZoneId: pulumi.String(zoneId),
			Name: domainValidationOption.ApplyT(func(option interface{}) string {
				return *option.(acm.CertificateDomainValidationOption).ResourceRecordName
			}).(pulumi.StringOutput),
			Type: domainValidationOption.ApplyT(func(option interface{}) string {
				return *option.(acm.CertificateDomainValidationOption).ResourceRecordType
			}).(pulumi.StringOutput),
			Records: pulumi.StringArray{
				domainValidationOption.ApplyT(func(option interface{}) string {
					return *option.(acm.CertificateDomainValidationOption).ResourceRecordValue
				}).(pulumi.StringOutput),
			},
			Ttl: pulumi.Int(10 * 60), // 10 minutes
		},
	)
	if err != nil {
		return nil, err
	}
	// Wait for the certificate validation to succeed
	validatedSslCertificate, err := acm.NewCertificateValidation(ctx,
		"ssl-cert-validation",
		&acm.CertificateValidationArgs{
			CertificateArn:        sslCertificate.Arn,
			ValidationRecordFqdns: pulumi.StringArray{sslCertificateValidationDnsRecord.Fqdn},
		},
		pulumi.Provider(awsUsEast1),
	)
	if err != nil {
		return nil, err
	}
	// Configure API Gateway to be able to use domain name & certificate
	apiDomainName, err := apigateway.NewDomainName(ctx, "api-domain-name",
		&apigateway.DomainNameArgs{
			CertificateArn: validatedSslCertificate.CertificateArn,
			DomainName:     pulumi.String(domain),
		},
	)
	if err != nil {
		return nil, err
	}
	// Create DNS record
	_, err = route53.NewRecord(ctx, "api-dns",
		&route53.RecordArgs{
			ZoneId: pulumi.String(zoneId),
			Type:   pulumi.String("A"),
			Name:   pulumi.String(domain),
			Aliases: route53.RecordAliasArray{
				route53.RecordAliasArgs{
					Name:                 apiDomainName.CloudfrontDomainName,
					EvaluateTargetHealth: pulumi.Bool(false),
					ZoneId:               apiDomainName.CloudfrontZoneId,
				},
			},
		})
	if err != nil {
		return nil, err
	}
	return apiDomainName, nil
}
