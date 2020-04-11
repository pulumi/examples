// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as policy from "@pulumi/policy";
import * as pulumi from "@pulumi/pulumi";

const stackPolicy: policy.StackValidationPolicy = {
    name: "eks-test",
    description: "EKS integration tests.",
    enforcementLevel: "mandatory",
    validateStack: async (args, reportViolation) => {
        const clusterResources = args.resources.filter(r => r.isType(aws.eks.Cluster));
        if (clusterResources.length !== 1) {
            reportViolation(`Expected one EKS Cluster but found ${clusterResources.length}`);
            return;
        }

        const cluster = clusterResources[0].asType(aws.eks.Cluster)!;
        if (cluster.version !== "1.13") {
            reportViolation(`Expected EKS Cluster '${cluster.name}' version to be '1.13' but found '${cluster.version}'`);
        }

        const vpcId = cluster.vpcConfig.vpcId;
        if (!vpcId) {
            // 'isDryRun==true' means the test are running in preview.
            // If so, the VPC might not exist yet even though it's defined in the program.
            // We shouldn't fail the test then to avoid false negatives.
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

const tests = new policy.PolicyPack("tests-pack", {
    policies: [stackPolicy],
});
