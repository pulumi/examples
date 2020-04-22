from pulumi_policy import (
    EnforcementLevel,
    PolicyPack,
    ReportViolation,
    ResourceValidationArgs,
    ResourceValidationPolicy,
)

def no_public_services_validator(args: ResourceValidationArgs, report_violation: ReportViolation):
    if args.resource_type == "kubernetes:core/v1:Service" and "spec" in args.props:
        spec = args.props["spec"]
        if "type" in spec and spec["type"] == "LoadBalancer":
            report_violation(
                "Kubernetes Services cannot be of type LoadBalancer, which are exposed to " +
                "anything that can reach the Kubernetes cluster. This likely including the " +
                "public Internet.")

no_public_services = ResourceValidationPolicy(
    name="no-public-services",
    description="Kubernetes Services should be cluster-private.",
    validate=no_public_services_validator,
)

PolicyPack(
    name="kubernetes-python",
    enforcement_level=EnforcementLevel.MANDATORY,
    policies=[
        no_public_services,
    ],
)
