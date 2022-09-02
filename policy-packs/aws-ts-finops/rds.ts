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

//Burstable
export function requireRdsInstanceType(
  name: string,
  instanceTypes: aws.rds.InstanceType | Iterable<aws.rds.InstanceType>,
  enforcementLevel: EnforcementLevel = "advisory"
): ResourceValidationPolicy {
  const types = utils.toStringSet(instanceTypes);

  return {
    name: name,
    description: "RDS instances should use approved instance types.",
    enforcementLevel: enforcementLevel,
    validateResource: [
      validateResourceOfType(
        aws.rds.Instance,
        (instance, args, reportViolation) => {
          if (
            instance.instanceClass !== undefined &&
            !types.has(instance.instanceClass)
          ) {
            reportViolation(
              "RDS Instance should use the approved instance types."
            );
          }
        }
      ),
      validateResourceOfType(
        aws.rds.ClusterInstance,
        (ci, args, reportViolation) => {
          if (!types.has(ci.instanceClass)) {
            reportViolation(
              "ClusterInstance should use the approved instance types."
            );
          }
        }
      ),
      //   validateResourceOfType(
      //     aws.rds.Cluster,
      //     (cluster, args, reportViolation) => {
      //       if (!cluster.dbClusterInstanceClass || !types.has(lt.instanceType)) {
      //         reportViolation(
      //           "EC2 LaunchTemplate should use the approved instance types."
      //         );
      //       }
      //     }
      //   ),
    ],
  };
}

//GP3
export function requireRdsVolumesGp2(
  name: string,
  enforcementLevel: EnforcementLevel
): ResourceValidationPolicy {
  return {
    name: name,
    description: "RDS StorageType Should be gp2",
    enforcementLevel: enforcementLevel,
    validateResource: [
      validateResourceOfType(
        aws.rds.Instance,
        (instance, args, reportViolation) => {
          if (
            instance.storageType !== undefined &&
            instance.storageType != "gp2"
          ) {
            reportViolation("RDS Instance should use gp2 storage type");
          }
        }
      ),
    ],
  };
}
//Volume Size -- future
