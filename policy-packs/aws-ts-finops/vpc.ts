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
