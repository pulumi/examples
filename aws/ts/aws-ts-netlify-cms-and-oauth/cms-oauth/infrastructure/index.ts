// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi"
import { config } from "process";
import * as random from "@pulumi/random";
import * as aws from "@pulumi/aws";

// Read stack inputs for Github key and Github secret and the domain for oauth provider
const pulumiConfig = new pulumi.Config();
const cmsStackConfig = {
    // Github key from the Github OAuth Application
    githubKey : pulumiConfig.require("githubKey"),
    // Github Secret from the Github OAuth Application
    githubSecret : pulumiConfig.requireSecret("githubSecret"),
    // The domain of the OAuth Server that we want
    targetDomain : pulumiConfig.require("targetDomain"),
    // (Optional) the github scope we want CMS to edit, the values are in this link https://developer.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/
    // You can also specify multiple scopes and separate by comma
    githubScope: pulumiConfig.get("githubScope"),
    // (Optional) Port number of the target group if not specified use port 80
    targetGroupPort : pulumiConfig.getNumber("targetGroupPort")
}


// ---- Creating certificate and domain for the oauth provider ---- //

// Get a east provider
const eastRegion = new aws.Provider("east", {
    profile: aws.config.profile,
    region: "us-east-1", // Per AWS, ACM certificate must be in the us-east-1 region.
});

// Creating a Certificate for the given domain.
const certificate = new aws.acm.Certificate("certificate", {
    domainName: cmsStackConfig.targetDomain,
    validationMethod: "DNS",
}, { provider: eastRegion });

// Split given domain in the configuration to domain and subdomain
const domainParts = getDomainAndSubdomain(cmsStackConfig.targetDomain);

// Get the zone of the given domain
const hostedZoneId = aws.route53.getZone({ name: domainParts.parentDomain }, { async: true }).then(zone => zone.zoneId);

// The temporation record for the validation domain has 10 to be live
const tenMinutes = 60 * 10;

/**
 *  Create a DNS record to prove that we _own_ the domain we're requesting a certificate for.
 *  See https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-validate-dns.html for more info.
 */
const certificateValidationDomain = new aws.route53.Record(`${cmsStackConfig.targetDomain}-validation`, {
    name: certificate.domainValidationOptions[0].resourceRecordName,
    zoneId: hostedZoneId,
    type: certificate.domainValidationOptions[0].resourceRecordType,
    records: [certificate.domainValidationOptions[0].resourceRecordValue],
    ttl: tenMinutes,
});

// Split a domain name into its subdomain and parent domain names.
// e.g. "www.example.com" => "www", "example.com".
function getDomainAndSubdomain(domain: string): { subdomain: string, parentDomain: string } {
    const parts = domain.split(".");
    if (parts.length < 2) {
        throw new Error(`No TLD found on ${domain}`);
    }
    // No subdomain, e.g. awesome-website.com.
    if (parts.length === 2) {
        return { subdomain: "", parentDomain: domain };
    }

    const subdomain = parts[0];
    parts.shift();  // Drop first element.
    return {
        subdomain,
        // Trailing "." to canonicalize domain.
        parentDomain: parts.join(".") + ".",
    };
}

/**
 * This is a _special_ resource that waits for ACM to complete validation via the DNS record
 * checking for a status of "ISSUED" on the certificate itself. No actual resources are
 * created (or updated or deleted).
 *
 * See https://www.terraform.io/docs/providers/aws/r/acm_certificate_validation.html for slightly more detail
 * and https://github.com/terraform-providers/terraform-provider-aws/blob/master/aws/resource_aws_acm_certificate_validation.go
 * for the actual implementation.
 */
const certificateValidation = new aws.acm.CertificateValidation("certificateValidation", {
    certificateArn: certificate.arn,
    validationRecordFqdns: [certificateValidationDomain.fqdn],
}, { provider: eastRegion });


// ---- ECS Fargate configuration ---- //

// Create an ECS Fargate cluster.
const cluster = new awsx.ecs.Cluster("cluster");

// Define an ec2 application load balancer alb to distribute incomming application traffic across multiple targets, such as EC2 instances, in multiple Availability Zones.
const alb = new awsx.lb.ApplicationLoadBalancer(
    "net-lb", { external: true, securityGroups: cluster.securityGroups });

// alb need a listener to listen to 443 the standard port for the HTTPS traffic, certificate is using the certificate we created above
const web = alb.createListener("web", {
    port: 443,
    external: true,
    protocol: "HTTPS",
    certificateArn: certificate.arn
});

let inputTargetGroupPort: pulumi.Input<number> = cmsStackConfig.targetGroupPort!;

if (inputTargetGroupPort === undefined) {
    inputTargetGroupPort = 80;
}

// when Listener Rule is satisfied then traffic is route to this target group.
const tg = alb.createTargetGroup("oauth-tg", {
    port: inputTargetGroupPort,
    loadBalancer: alb
});

// when the request are forwarded then every requests are send to the target group we created
new awsx.lb.ListenerRule("oauth-listener-rule", web, {
    actions: [{
        type: "forward",
        targetGroupArn: tg.targetGroup.arn,
    }],
    conditions: [{
        pathPattern: {values: ["/*"]} //wildcard says every request would be send
    }],
});

// Build and publish a Docker image to a private ECR registry.
const img = awsx.ecs.Image.fromPath("cms-oauth-img", "../");

// Create a random string and also mark its `result` property as a secret,
// so it is not stored in plaintext in the stack's state.
const sessionSecretRandomString = new random.RandomPassword("random", {
    length: 32,
}, { additionalSecretOutputs: ["result"] });


let inputGithubScope: pulumi.Input<string> = cmsStackConfig.githubScope!;

// Create a Fargate service task that can scale out.
const appService = new awsx.ecs.FargateService("app-svc", {
    cluster,
    taskDefinitionArgs: {
        container: {
            image: img,
            memory: 128 /*MB*/,
            portMappings: [ tg ],
            environment: [
                {
                    name: "HOST",
                    // The target domain which would concatenate with callbacks in main.go
                    value: pulumi.interpolate `https://${cmsStackConfig.targetDomain}`
                },
                {
                    name: "SESSION_SECRET",
                    value: sessionSecretRandomString.result
                },
                {
                    name: "GITHUB_KEY",
                    value: cmsStackConfig.githubKey
                },
                {
                    name: "GITHUB_SECRET",
                    value: cmsStackConfig.githubSecret
                },
                {
                    name: "TARGET_PORT",
                    value: pulumi.interpolate `${inputTargetGroupPort}`
                },
                {
                    name: "GITHUB_SCOPE",
                    value: inputGithubScope
                },
            ]
        },
    },
    desiredCount: 1,
});


// ---- Create Alias Record ---- //

// Creates a new Route53 DNS record pointing the domain to the CloudFront distribution.
function createAliasRecord(
    targetDomain: string, lb: awsx.lb.ApplicationLoadBalancer): aws.route53.Record {
    const domainParts = getDomainAndSubdomain(targetDomain);
    const hostedZoneId = aws.route53.getZone({ name: domainParts.parentDomain }, { async: true }).then(zone => zone.zoneId);
    return new aws.route53.Record(
        targetDomain,
        {
            name: domainParts.subdomain,
            zoneId: hostedZoneId,
            type: "A",
            aliases: [
                {
                    name: lb.loadBalancer.dnsName,
                    zoneId: lb.loadBalancer.zoneId,
                    evaluateTargetHealth: true,
                },
            ],
        });
}
// Create the aliasRecord with targetdomain and application load balancer
const aRecord = createAliasRecord(cmsStackConfig.targetDomain, alb);

// Export the Internet address for the service.
export const rawEndpointUrl = web.endpoint.hostname;
