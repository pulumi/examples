// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import {
    ReportViolation,
    ResourceValidationArgs,
    ResourceValidationPolicy,
    StackValidationPolicy,
    EnforcementLevel,
    validateResourceOfType,
} from "@pulumi/policy";
import * as utils from "./utils";

export function requireSingleNatGateway(
    name: string,
    enforcementLevel: EnforcementLevel
): StackValidationPolicy {
    return {
        name: name,
        description: "There should be a max of one Nat Gateway",
        enforcementLevel: enforcementLevel,
        validateStack: (stack, reportViolation) => {
            let counter = 0;
            for (const resource of stack.resources) {
                if (resource.type != "aws:ec2/natGateway:NatGateway") {
                    return;
                } else {
                    counter = counter + 1;
                }
            }
            if (counter != 0) {
                reportViolation("Stack can only have one Nat Gateway");
            }
        },
    };
}

// Todo
// The following strategies can help you reduce the data transfer charges for your NAT gateway:
// If your AWS resources send or receive a significant volume of traffic across Availability Zones, ensure that the resources are in the same Availability Zone as the NAT gateway, or create a NAT gateway in the same Availability Zone as the resources.
// If most traffic through your NAT gateway is to AWS services that support interface endpoints or gateway endpoints, consider creating an interface endpoint or gateway endpoint for these services. For more information about the potential cost savings, see AWS PrivateLink pricing.
