// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as policy from "@pulumi/policy";
import * as pulumi from "@pulumi/pulumi";

const stackPolicy: policy.StackValidationPolicy = {
    name: "eks-test",
    description: "EKS integration tests.",
    enforcementLevel: "mandatory",
    validateStack: async (args, reportViolation) => {
        const clusterResource = args.resources.find(r => r.isType(aws.eks.Cluster));
        const cluster = clusterResource && clusterResource.asType(aws.eks.Cluster);
        if (!cluster) {
            reportViolation("EKS Cluster not found");
            return;
        }

        if (cluster.version !== "1.13") {
            reportViolation(`Expected EKS Cluster '${cluster.name}' version to be '1.13' but found '${cluster.version}'`);
        }

        const vpcId = cluster.vpcConfig.vpcId;
        if (!vpcId) {
            if (!pulumi.runtime.isDryRun()) {
                reportViolation(`EKS Cluster '${cluster.name}' has unknown VPC`);
            }
            return;
        }

        const ec2 = new aws.sdk.EC2({region: aws.config.region});
        const response = await ec2.describeVpcs().promise();
        const defaultVpc = response.Vpcs?.find(vpc => vpc.IsDefault);
        if (!defaultVpc) {
            reportViolation("Default VPC not found");
            return;
        }

        if (defaultVpc.VpcId === vpcId) {
            reportViolation(`EKS Cluster '${cluster.name}' should not use the default VPC`);
        }
    },
}

const tests = new policy.PolicyPack("aws-eks-unit-tests", {
    policies: [stackPolicy],
});

