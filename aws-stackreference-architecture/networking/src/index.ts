import { Config, getStack } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import {Vpc} from "./vpc";

const config = new Config();

const azCount = config.getNumber("azCount") || 2;

const baseTags = {
	ManagedBy: "Pulumi",
	PulumiStack: getStack(),
};
const availabilityZones = aws.getAvailabilityZones({
	state: "available",
});

const outputs = availabilityZones.then(zones => {
	const appVpc = new Vpc("app-vpc", {
		description: `${baseTags.ManagedBy} App VPC`,
		baseTags: baseTags,
	
		baseCidr: "172.28.0.0/16",
		availabilityZoneNames: zones.names.slice(0, azCount),
		enableFlowLogs: true,
	
		endpoints: {
			s3: true,
			dynamodb: true,
		},
	});

	const dataVpc = new Vpc("data-vpc", {
		description: `${baseTags.ManagedBy} Data VPC`,
		baseTags: baseTags,
	
		baseCidr: "172.18.0.0/16",
		availabilityZoneNames: zones.names.slice(0, azCount),
		enableFlowLogs: true,
	
		endpoints: {
			s3: true,
			dynamodb: true,
		},
	});

	appVpc.configurePeering({
		peerVpc: dataVpc,
		nameTag: `${baseTags.ManagedBy} Peer App to Data`,
		routeSubnets: "private",
	});
	
	const peeredSg = dataVpc.createPeeredSecurityGroup({
		peeredVpc: appVpc,
	});

	return {
		appVpcId: appVpc.vpcId(),
		appVpcPrivateSubnetIds: appVpc.privateSubnetIds(),
		appVpcPublicSubnetIds: appVpc.publicSubnetIds(),
		dataVpcId: dataVpc.vpcId(),
		dataVpcPrivateSubnetIds: dataVpc.privateSubnetIds(),
		dataVpcPublicSubnetIds: dataVpc.publicSubnetIds(),
		peeredSecurityGroupId: peeredSg
	}
});


export const appVpcId = outputs.then(x => x.appVpcId);
export const appVpcPrivateSubnetIds = outputs.then(x => x.appVpcPrivateSubnetIds);
export const appVpcPublicSubnetIds = outputs.then(x => x.appVpcPublicSubnetIds);

export const dataVpcId = outputs.then(x => x.dataVpcId);
export const dataVpcPrivateSubnetIds = outputs.then(x => x.dataVpcPrivateSubnetIds);
export const dataVpcPublicSubnetIds = outputs.then(x => x.dataVpcPublicSubnetIds);

export const peeredSecurityGroupId = outputs.then(x => x.peeredSecurityGroupId);

