import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";

// importing local configs
const config = new pulumi.Config();
const env = pulumi.getStack()
const vpc_name = config.require("vpc_name");
const zone_number = config.requireNumber("zone_number");
const vpc_cidr = config.require("vpc_cidr");
const number_of_nat_gateways = config.requireNumber("number_of_nat_gateways");

const baseTags = {
  "Name": `${vpc_name}`,
  "availability_zones_used": `${zone_number}`,
  "cidr_block": `${vpc_cidr}`,
  "crosswalk": "yes",
  "number_of_nat_gateways": `${number_of_nat_gateways}`,
  "demo": "true",
  "pulumi:Project": pulumi.getProject(),
  "pulumi:Stack": pulumi.getStack(),
  "cost_center": "1234",
}

// Allocate a new VPC with the CIDR range from config file:
const vpc = new awsx.ec2.Vpc(vpc_name, {
  cidrBlock: vpc_cidr,
  numberOfAvailabilityZones: zone_number,
  numberOfNatGateways: number_of_nat_gateways,
  tags: baseTags,

});

// Export a few resulting fields to make them easy to use:
export const pulumi_vpc_name = vpc_name;
export const pulumi_vpc_id = vpc.id;
export const pulumi_vpc_az_zones = zone_number;
export const pulumi_vpc_cidr = vpc_cidr;
export const pulumic_vpc_number_of_nat_gateways = number_of_nat_gateways;
export const pulumi_vpc_private_subnet_ids = vpc.privateSubnetIds;
export const pulumi_vpc_public_subnet_ids = vpc.publicSubnetIds;
export const pulumi_vpc_aws_tags = baseTags;