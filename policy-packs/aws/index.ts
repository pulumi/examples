import * as aws from "@pulumi/aws";
import { PolicyPack, typedRule } from "@pulumi/policy";
import * as assert from "assert";

const policies = new PolicyPack("aws", {
    policies: [
        {
            name: "discouraged-ec2-public-ip-address",
            description: "Associating public IP addresses is discouraged.",
            enforcementLevel: "advisory",
            rules: typedRule(aws.ec2.Instance.isInstance, it => {
                assert(it.associatePublicIpAddress === false);
            }),
        },
        {
            name: "required-name-tag",
            description: "A 'Name' tag is required.",
            enforcementLevel: "mandatory",
            rules: [
                typedRule(aws.ec2.Instance.isInstance, it => {
                    requireNameTag(it.tags);
                }),
                typedRule(aws.ec2.Vpc.isInstance, it => {
                    requireNameTag(it.tags);
                }),
            ]
        },
        {
            name: "prohibited-public-internet",
            description: "Ingress rules with public internet access are prohibited.",
            enforcementLevel: "mandatory",
            rules: typedRule(aws.ec2.SecurityGroup.isInstance, it => {
                const publicInternetRules = it.ingress.find(ingressRule =>
                    (ingressRule.cidrBlocks || []).find(cidr =>
                        cidr === "0.0.0.0/0"
                    )
                );
                assert(publicInternetRules === undefined);
            }),
        },
        {
            name: "prohibited-elasticbeanstalk",
            description: "Use of Elastic Beanstalk is prohibited.",
            enforcementLevel: "mandatory",
            rules: (type: string) => {
                assert(type.startsWith("aws:elasticbeanstalk") === false);
            },
        },
    ],
});

const requireNameTag = function (tags: any) {
    assert((tags || {})["Name"] !== undefined);
};
