import * as aws from "@pulumi/aws";
import { PolicyPack, validateStackResourcesOfType } from "@pulumi/policy";

const requiredRegion = "us-west-1"
const maxNumBuckets = 1

new PolicyPack("stackvalidation-ts", {
    policies: [
        {
            name: "s3-region-check",
            description: "Checks the region the bucket was deployed in.",
            enforcementLevel: "advisory", // "mandatory"
            validateStack: (stack, reportViolation) => {
                // stack contains all the resources created by the stack. So, loop through them to find S3 buckets and check the region output.
                for (const resource of stack.resources) {
                    if (resource.type == "aws:s3/bucket:Bucket") {
                        // Check if the region property has been set yet - which it won't on initial preview since AWS hasn't returned that output property yet.
                        // But if is set which will be the case once the stack is created and for subsequent previews, check it.
                        if (resource.props.hasOwnProperty("region") && resource.props.region != requiredRegion) {
                            reportViolation(`Bucket, ${resource.name}, must be in region ${requiredRegion}`)
                        }
                    }
                }
            }
        },
        {
            name: "s3-count-check",
            description: "Checks the number of S3 buckets created in the stack.",
            enforcementLevel: "advisory", // "mandatory"
            validateStack: (stack, reportViolation) => {
                // Gather up all the buckets in the stack.
                const buckets = stack.resources.filter((resource) => resource.isType(aws.s3.Bucket))
                // Make sure there no more than the allowed number of buckets.
                if (buckets.length > maxNumBuckets) {
                    reportViolation(`No more than ${maxNumBuckets} bucket(s) should be created.`)
                }
            }
        }
    ],
});
