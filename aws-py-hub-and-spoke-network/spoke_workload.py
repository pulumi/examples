from dataclasses import dataclass

import json

import pulumi
import pulumi_aws as aws


@dataclass
class SpokeWorkloadArgs:
    spoke_vpc_id: pulumi.Input[str]
    spoke_instance_subnet_id: str


class SpokeWorkload(pulumi.ComponentResource):
    '''Comprises a small EC2 instance running Amazon Linux 2 with SSM shell
    access and security group to verify network connectivity.'''

    def __init__(self, name: str, args: SpokeWorkloadArgs, opts: pulumi.ResourceOptions = None) -> None:
        super().__init__("awsAdvancedNetworking:index:SpokeWorkload", name, None, opts)

        sg = aws.ec2.SecurityGroup(
            f"{name}-instance-sg",
            aws.ec2.SecurityGroupArgs(
                description="Allow all outbound traffic",
                vpc_id=args.spoke_vpc_id,
                egress=[
                    aws.ec2.SecurityGroupEgressArgs(
                        cidr_blocks=["0.0.0.0/0"],
                        description="Allow everything",
                        protocol="-1",
                        from_port=0,
                        to_port=0
                    ),
                ]
            ),
            opts=pulumi.ResourceOptions(
                parent=self
            ),
        )

        ec2_role = aws.iam.Role(
            f"{name}-instance-role",
            aws.iam.RoleArgs(
                assume_role_policy=json.dumps({
                    "Version": "2012-10-17",
                    "Statement": {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "ec2.amazonaws.com",
                        },
                        "Action": "sts:AssumeRole",
                    },
                })
            ),
            opts=pulumi.ResourceOptions(
                parent=self
            ),
        )

        aws.iam.RolePolicyAttachment(
            f"{name}-role-policy-attachment",
            aws.iam.RolePolicyAttachmentArgs(
                role=ec2_role.name,
                policy_arn="arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
            ),
            opts=pulumi.ResourceOptions(
                parent=self
            ),
        )

        instance_profile = aws.iam.InstanceProfile(
            f"{name}-instance-profile",
            aws.iam.InstanceProfileArgs(
                role=ec2_role.name,
            ),
            opts=pulumi.ResourceOptions(
                parent=self
            ),
        )

        amazon_linux_2 = aws.ec2.get_ami(
            most_recent=True,
            owners=["amazon"],
            filters=[
                aws.ec2.GetAmiFilterArgs(
                    name="name",
                    values=["amzn2-ami-hvm-*-x86_64-gp2"],
                ),
                aws.ec2.GetAmiFilterArgs(
                    name="owner-alias",
                    values=["amazon"],
                )
            ],
        )

        aws.ec2.Instance(
            f"{name}-instance",
            aws.ec2.InstanceArgs(
                ami=amazon_linux_2.id,
                instance_type="t3.micro",
                vpc_security_group_ids=[sg.id],
                subnet_id=args.spoke_instance_subnet_id,
                tags={
                    "Name": f"{name}-instance",
                },
                iam_instance_profile=instance_profile.name,
            ),
            opts=pulumi.ResourceOptions(
                parent=self
            ),
        )
