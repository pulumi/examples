from pulumi_policy import (
    EnforcementLevel,
    PolicyPack,
    ReportViolation,
    StackValidationArgs,
    StackValidationPolicy,
)

required_region = "us-west-1"
max_num_buckets = 1

def s3_region_check_validator(stack: StackValidationArgs, report_violation: ReportViolation):
    for resource in stack.resources:
        if resource.resource_type == "aws:s3/bucket:Bucket": 
            if "region" in resource.props and resource.props["region"] != required_region:
                report_violation(f"Bucket, {resource.name}, must be in region {required_region}")

s3_region_check = StackValidationPolicy(
    name="s3-region-check",
    description= "Checks the region the bucket was deployed in.",
    validate=s3_region_check_validator
)

def s3_count_check_validator(stack: StackValidationArgs, report_violation: ReportViolation):
    buckets = list(filter((lambda resource: resource.resource_type == "aws:s3/bucket:Bucket"), stack.resources))
    if len(buckets) > max_num_buckets:
        report_violation(f"No more than {max_num_buckets} bucket(s) should be created.")

s3_count_check = StackValidationPolicy(
    name="s3-count-check",
    description= "Checks the number of buckets created.",
    validate=s3_count_check_validator
)

PolicyPack(
    name="aws-python",
    enforcement_level=EnforcementLevel.ADVISORY,
    policies=[
        s3_region_check,
        s3_count_check
    ],
)
