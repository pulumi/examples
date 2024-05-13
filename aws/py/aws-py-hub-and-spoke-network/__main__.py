"""A Python Pulumi program"""

import pulumi
import pulumi_aws as aws

from inspection import InspectionVpc, InspectionVpcArgs
from spoke import SpokeVpc, SpokeVpcArgs
from spoke_workload import SpokeWorkload, SpokeWorkloadArgs
from firewall_rules import create_firewall_policy

project = pulumi.get_project()

config = pulumi.Config()
supernet_cidr = config.get("supernet-cidr") or "10.0.0.0/8"
create_firewall = config.get_bool("create-firewall") or False

tgw = aws.ec2transitgateway.TransitGateway(
    "tgw",
    aws.ec2transitgateway.TransitGatewayArgs(
        description=f"Transit Gateway - {project}",
        default_route_table_association="disable",
        default_route_table_propagation="disable",
        tags={
            "Name": "Pulumi"
        }
    )
)

spoke_tgw_route_table = aws.ec2transitgateway.RouteTable(
    "spoke-tgw-route-table",
    aws.ec2transitgateway.RouteTableArgs(
        transit_gateway_id=tgw.id,
        tags={
            "Name": "spoke-tgw",
        }
    ),
    opts=pulumi.ResourceOptions(
        parent=tgw,
    ),
)

inspection_tgw_route_table = aws.ec2transitgateway.RouteTable(
    "insp-tgw-route-table",
    aws.ec2transitgateway.RouteTableArgs(
        transit_gateway_id=tgw.id,
        tags={
            "Name": "insp-tgw-route-table",
        }
    ),
    opts=pulumi.ResourceOptions(
        parent=tgw,
    ),
)

if create_firewall:
    firewall_policy_arn = create_firewall_policy(supernet_cidr)

insp_vpc = InspectionVpc(
    "inspection",
    InspectionVpcArgs(
        supernet_cidr_block=supernet_cidr,
        vpc_cidr_block="10.129.0.0/24",
        tgw_id=tgw.id,
        inspection_tgw_route_table_id=inspection_tgw_route_table.id,
        spoke_tgw_route_table_id=spoke_tgw_route_table.id,
        firewall_policy_arn=firewall_policy_arn if create_firewall else None,
    )
)

pulumi.export("nat-gateway-eip", insp_vpc.eip.public_ip)

spoke1_vpc = SpokeVpc(
    "spoke1",
    SpokeVpcArgs(
        vpc_cidr_block="10.0.0.0/16",
        tgw_id=tgw.id,
        tgw_route_table_id=spoke_tgw_route_table.id,
    ),
)

aws.ec2transitgateway.RouteTablePropagation(
    "insp-to-spoke1",
    aws.ec2transitgateway.RouteTablePropagationArgs(
        transit_gateway_attachment_id=spoke1_vpc.tgw_attachment.id,
        transit_gateway_route_table_id=inspection_tgw_route_table.id,
    )
)

spoke1_workload = SpokeWorkload(
    "spoke1",
    SpokeWorkloadArgs(
        spoke_instance_subnet_id=spoke1_vpc.workload_subnet_ids[0],
        spoke_vpc_id=spoke1_vpc.vpc.vpc_id,
    )
)

spoke2_vpc = SpokeVpc(
    "spoke2",
    SpokeVpcArgs(
        vpc_cidr_block="10.1.0.0/16",
        tgw_id=tgw.id,
        tgw_route_table_id=spoke_tgw_route_table.id,
    ),
)


aws.ec2transitgateway.RouteTablePropagation(
    "insp-to-spoke2",
    aws.ec2transitgateway.RouteTablePropagationArgs(
        transit_gateway_attachment_id=spoke2_vpc.tgw_attachment.id,
        transit_gateway_route_table_id=inspection_tgw_route_table.id,
    ),
)


spoke2_workload = SpokeWorkload(
    "spoke2",
    SpokeWorkloadArgs(
        spoke_instance_subnet_id=spoke2_vpc.workload_subnet_ids[0],
        spoke_vpc_id=spoke2_vpc.vpc.vpc_id,
    )
)
