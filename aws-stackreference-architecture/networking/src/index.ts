import { Config, getStack } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import {Vpc} from "./vpc";

async function main() {
    const config = new Config();

    const azCount = config.getNumber("azCount") || 2;

    const baseTags = {
        ManagedBy: "Pulumi",
        PulumiStack: getStack(),
    };
    const availabilityZones = aws.getAvailabilityZones({
        state: "available",
    }, { async: true });

    const appVpc = new Vpc("app-vpc", {
        description: `${baseTags.ManagedBy} App VPC`,
        baseTags: baseTags,

        baseCidr: "172.28.0.0/16",
        availabilityZoneNames: availabilityZones.names.slice(0, azCount),
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
        availabilityZoneNames: availabilityZones.names.slice(0, azCount),
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

        peeredSecurityGroupId: peeredSg,
    };
}

module.exports = main();

