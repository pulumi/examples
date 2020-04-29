from pulumi_policy import (
    EnforcementLevel,
    PolicyPack,
    ReportViolation,
    ResourceValidationArgs,
    ResourceValidationPolicy,
)

def storage_container_no_public_read_validator(args: ResourceValidationArgs, report_violation: ReportViolation):
    if args.resource_type == "azure:storage/container:Container" and "containerAccessType" in args.props:
        access_type = args.props["containerAccessType"]
        if access_type == "blob" or access_type == "container":
            report_violation(
                "Azure Storage Container must not have blob or container access set. " +
                "Read more about read access here: " +
                "https://docs.microsoft.com/en-us/azure/storage/blobs/storage-manage-access-to-resources")

storage_container_no_public_read = ResourceValidationPolicy(
    name="storage-container-no-public-read",
    description="Prohibits setting the public permission on Azure Storage Blob Containers.",
    validate=storage_container_no_public_read_validator,
)

PolicyPack(
    name="azure-python",
    enforcement_level=EnforcementLevel.MANDATORY,
    policies=[
        storage_container_no_public_read,
    ],
)
