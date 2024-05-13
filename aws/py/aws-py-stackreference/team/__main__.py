from pulumi import StackReference, Config, export
from pulumi_aws import get_ami, ec2, GetAmiFilterArgs

config = Config()
company_stack = StackReference(config.require("companyStack"))
department_stack = StackReference(config.require("departmentStack"))

combines_tags = {
    "department": department_stack.get_output("departmentName"),
    "company": company_stack.get_output("companyName"),
    "team": config.require("teamName"),
    "Managed By": "Pulumi",
}

ami_id = get_ami(
    most_recent=True,
    owners=["099720109477"],
    filters=[
        GetAmiFilterArgs(
            name="name",
            values=["ubuntu/images/hvm-ssd/ubuntu-bionic-18.04-amd64-server-*"]
        )]
).id

instance = ec2.Instance(
    "tagged",
    instance_type="t2.medium",
    ami=ami_id,
    tags=combines_tags)

export("instance_id", instance.id)
export("instance_tags", instance.tags)
