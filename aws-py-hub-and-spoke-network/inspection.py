from dataclasses import dataclass
from typing import Sequence

import pulumi
import pulumi_aws as aws
import pulumi_awsx as awsx


def _find_endpoint_for_az(az: str, statuses) -> str:
    for sync_state in statuses[0]["sync_states"]:
        if sync_state["availability_zone"] == az:
            return sync_state["attachments"][0]["endpoint_id"]
    raise Exception(f"No firewall endpoint found for AZ '{az}'")


@dataclass
class InspectionVpcArgs:
    supernet_cidr_block: str
    vpc_cidr_block: str
    tgw_id: pulumi.Input[str]
    spoke_tgw_route_table_id: pulumi.Input[str]
    inspection_tgw_route_table_id: pulumi.Input[str]
    # This is only used if we're creating a firewall:
    firewall_policy_arn: pulumi.Input[str]


class InspectionVpc(pulumi.ComponentResource):
    def __init__(
        self, name: str, args: InspectionVpcArgs, opts: pulumi.ResourceOptions = None
    ) -> None:
        super().__init__("awsAdvancedNetworking:index:InspectionVpc", name, None, opts)

        self.name = name
        self.args = args

        self.vpc = awsx.ec2.Vpc(
            f"{name}-vpc",
            awsx.ec2.VpcArgs(
                cidr_block=args.vpc_cidr_block,
                subnet_specs=[
                    awsx.ec2.SubnetSpecArgs(
                        type=awsx.ec2.SubnetType.PUBLIC,
                        cidr_mask=28,
                    ),
                    # We create these as isolated even because it's easier to change
                    # the route from the NAT to the firewall once we add it.
                    awsx.ec2.SubnetSpecArgs(
                        type=awsx.ec2.SubnetType.ISOLATED, cidr_mask=28, name="tgw"
                    ),
                ],
                # We specify no NAT Gateways because at the time of writing we
                # have overly-strict validation for NAT Gateway strategy. We can
                # specify directly here once
                # https://github.com/pulumi/pulumi-awsx/issues/966 is resolved.
                nat_gateways=awsx.ec2.NatGatewayConfigurationArgs(
                    strategy=awsx.ec2.NatGatewayStrategy.NONE
                ),
                subnet_strategy=awsx.ec2.SubnetAllocationStrategy.AUTO,
            ),
            opts=pulumi.ResourceOptions(
                *(opts or {}),
                parent=self,
            ),
        )

        self.eip = aws.ec2.Eip(
            f"{name}-eip",
            opts=pulumi.ResourceOptions(
                parent=self,
                depends_on=[self.vpc],
            ),
        )

        self.nat_gateway = aws.ec2.NatGateway(
            f"{name}-nat-gateway",
            aws.ec2.NatGatewayArgs(
                subnet_id=self.vpc.public_subnet_ids[0],
                allocation_id=self.eip.allocation_id,
                tags={
                    "Name": f"{name}-nat-gateway",
                },
            ),
            pulumi.ResourceOptions(
                parent=self,
                depends_on=[self.vpc],
            ),
        )

        self.tgw_attachment = aws.ec2transitgateway.VpcAttachment(
            f"{name}-tgw-vpc-attachment",
            aws.ec2transitgateway.VpcAttachmentArgs(
                transit_gateway_id=self.args.tgw_id,
                subnet_ids=self.vpc.isolated_subnet_ids,
                vpc_id=self.vpc.vpc_id,
                transit_gateway_default_route_table_association=False,
                transit_gateway_default_route_table_propagation=False,
                appliance_mode_support="enable",
                tags={
                    "Name": f"{name}",
                },
            ),
            # We can only have one attachment per VPC, so we need to tell Pulumi
            # explicitly to delete the old one before creating a new one:
            pulumi.ResourceOptions(
                delete_before_replace=True,
                depends_on=[self.vpc],
                parent=self,
            ),
        )

        aws.ec2transitgateway.Route(
            f"{name}-spoke-to-inspection",
            aws.ec2transitgateway.RouteArgs(
                destination_cidr_block="0.0.0.0/0",
                transit_gateway_attachment_id=self.tgw_attachment.id,
                transit_gateway_route_table_id=args.spoke_tgw_route_table_id,
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
            ),
        )

        aws.ec2transitgateway.RouteTableAssociation(
            f"{name}-tgw-route-table-assoc",
            aws.ec2transitgateway.RouteTableAssociationArgs(
                transit_gateway_attachment_id=self.tgw_attachment.id,
                transit_gateway_route_table_id=args.inspection_tgw_route_table_id,
            ),
            pulumi.ResourceOptions(parent=self),
        )

        # We know that there are 3 AZs in our VPC because that is the default
        # for the AWSX VPC component and we don't specify an argument and we
        # also do not allow the input to be configurable in this component.
        #
        # Because we know there are 3 AZs, we can extract the 3 subnet IDs into
        # a list of known length, which in turn allows us to avoid creating
        # resources in an apply(), which is bad practice because the pulumi
        # preview output would not necessarily match the pulumi up behavior.
        #
        # If we did not know the length of the list in advance, we would have to
        # call apply on the list of unknown length and then loop through its
        # values to create the necessary routes.
        public_subnet_ids = [
            self.vpc.public_subnet_ids.apply(lambda x: x[0]),
            self.vpc.public_subnet_ids.apply(lambda x: x[1]),
            self.vpc.public_subnet_ids.apply(lambda x: x[2]),
        ]

        isolated_subnet_ids = [
            self.vpc.isolated_subnet_ids.apply(lambda x: x[0]),
            self.vpc.isolated_subnet_ids.apply(lambda x: x[1]),
            self.vpc.isolated_subnet_ids.apply(lambda x: x[2]),
        ]

        if args.firewall_policy_arn:
            self.create_firewall()
            self.create_firewall_routes(public_subnet_ids, isolated_subnet_ids)
        else:
            self.create_direct_nat_routes(public_subnet_ids, isolated_subnet_ids)

        self.register_outputs(
            {
                "vpc": self.vpc,
                "eip": self.eip,
                "tgw_attachment": self.tgw_attachment,
            }
        )

    def create_direct_nat_routes(
        self,
        public_subnet_ids: Sequence[pulumi.Input[str]],
        isolated_subnet_ids: Sequence[pulumi.Input[str]],
    ):
        # Create routes for the supernet (a CIDR block that encompasses all
        # spoke VPCs) from the public subnets in the inspection VPC (where the
        # NAT Gateways for centralized egress live) to the TGW.
        for i, subnet_id in enumerate(public_subnet_ids):
            route_table = aws.ec2.get_route_table_output(subnet_id=subnet_id)

            aws.ec2.Route(
                f"{self.name}-public-route-{i}-to-tgw",
                aws.ec2.RouteArgs(
                    route_table_id=route_table.id,
                    destination_cidr_block=self.args.supernet_cidr_block,
                    transit_gateway_id=self.args.tgw_id,
                ),
                pulumi.ResourceOptions(
                    depends_on=[self.tgw_attachment],
                    parent=self,
                    delete_before_replace=True,
                ),
            )

        # Create routes from the TGW subnet to the NAT Gateway.
        for i, subnet_id in enumerate(isolated_subnet_ids):
            route_table = aws.ec2.get_route_table_output(subnet_id=subnet_id)

            aws.ec2.Route(
                f"{self.name}-isolated-route-{i}-to-nat",
                aws.ec2.RouteArgs(
                    route_table_id=route_table.id,
                    destination_cidr_block="0.0.0.0/0",
                    nat_gateway_id=self.nat_gateway.id,
                ),
                pulumi.ResourceOptions(
                    parent=self,
                ),
            )

    def create_firewall(self):
        region = aws.config.region
        inspection_subnets = [
            {"az": f"{region}a", "cidr": "10.129.0.32/28"},
            {"az": f"{region}b", "cidr": "10.129.0.96/28"},
            {"az": f"{region}c", "cidr": "10.129.0.160/28"},
        ]
        subnet_ids = []
        for i, inspection_subnet in enumerate(inspection_subnets):
            resource_name = f"{self.name}-inspection-{i+1}"
            subnet = aws.ec2.Subnet(
                resource_name,
                aws.ec2.SubnetArgs(
                    vpc_id=self.vpc.vpc_id,
                    availability_zone=inspection_subnet["az"],
                    cidr_block=inspection_subnet["cidr"],
                    tags={"Name": resource_name},
                ),
                opts=pulumi.ResourceOptions(
                    parent=self,
                    # This makes it easier to avoid CIDR block conflicts:
                    delete_before_replace=True,
                ),
            )

            subnet_ids.append(subnet.id)

            route_table = aws.ec2.RouteTable(
                resource_name,
                aws.ec2.RouteTableArgs(
                    vpc_id=self.vpc.vpc_id,
                    tags={
                        "Name": resource_name,
                    },
                ),
                opts=pulumi.ResourceOptions(
                    parent=subnet,
                ),
            )

            aws.ec2.RouteTableAssociation(
                resource_name,
                aws.ec2.RouteTableAssociationArgs(
                    route_table_id=route_table.id, subnet_id=subnet.id
                ),
                opts=pulumi.ResourceOptions(
                    parent=subnet,
                ),
            )

            aws.ec2.Route(
                f"{self.name}-insp-supernet-to-tgw-{i+1}",
                aws.ec2.RouteArgs(
                    route_table_id=route_table.id,
                    destination_cidr_block=self.args.supernet_cidr_block,
                    transit_gateway_id=self.args.tgw_id,
                ),
                opts=pulumi.ResourceOptions(
                    parent=route_table,
                    delete_before_replace=True,
                ),
            )

            aws.ec2.Route(
                f"{self.name}-insp-default-to-nat-{i+1}",
                aws.ec2.RouteArgs(
                    route_table_id=route_table.id,
                    destination_cidr_block="0.0.0.0/0",
                    nat_gateway_id=self.nat_gateway.id,
                ),
                opts=pulumi.ResourceOptions(
                    parent=route_table,
                    delete_before_replace=True,
                ),
            )

        subnet_mappings = list(map(lambda id: {"subnet_id": id}, subnet_ids))

        self.firewall = aws.networkfirewall.Firewall(
            f"{self.name}-firewall",
            aws.networkfirewall.FirewallArgs(
                vpc_id=self.vpc.vpc_id,
                firewall_policy_arn=self.args.firewall_policy_arn,
                subnet_mappings=subnet_mappings,
            ),
            opts=pulumi.ResourceOptions(
                parent=self,
            ),
        )

    def create_firewall_routes(
        self,
        public_subnet_ids: Sequence[pulumi.Input[str]],
        tgw_subnet_ids: Sequence[pulumi.Input[str]],
    ):
        # Add routes from public subnets to the firewall for incoming packets.
        for i, subnet_id in enumerate(public_subnet_ids):
            subnet = aws.ec2.get_subnet_output(id=subnet_id)
            route_table = aws.ec2.get_route_table_output(subnet_id=subnet_id)

            endpoint_id = pulumi.Output.all(
                subnet.availability_zone,
                self.firewall.firewall_statuses,
            ).apply(lambda args: _find_endpoint_for_az(args[0], args[1]))

            aws.ec2.Route(
                f"{self.name}-public-{i}-to-firewall",
                aws.ec2.RouteArgs(
                    route_table_id=route_table.id,
                    destination_cidr_block=self.args.supernet_cidr_block,
                    vpc_endpoint_id=endpoint_id,
                ),
                pulumi.ResourceOptions(
                    parent=self,
                    delete_before_replace=True,
                ),
            )

        # Add routes from the TGW subnets to the firewall for outgoing packets.
        for i, subnet_id in enumerate(tgw_subnet_ids):
            subnet = aws.ec2.get_subnet_output(id=subnet_id)
            route_table = aws.ec2.get_route_table_output(subnet_id=subnet_id)

            endpoint_id = pulumi.Output.all(
                subnet.availability_zone,
                self.firewall.firewall_statuses,
            ).apply(lambda args: _find_endpoint_for_az(args[0], args[1]))

            aws.ec2.Route(
                f"{self.name}-tgw-{i}-to-firewall",
                aws.ec2.RouteArgs(
                    route_table_id=route_table.id,
                    destination_cidr_block="0.0.0.0/0",
                    vpc_endpoint_id=endpoint_id,
                ),
                pulumi.ResourceOptions(
                    parent=self,
                ),
            )
