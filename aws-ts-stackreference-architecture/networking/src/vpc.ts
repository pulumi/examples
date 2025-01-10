import * as aws from "@pulumi/aws";
import { ComponentResource, ComponentResourceOptions, Input, Output } from "@pulumi/pulumi";

export interface VpcArgs {
    description: string;
    baseTags: aws.Tags;

    baseCidr: string;
    availabilityZoneNames: string[];
    enableFlowLogs?: boolean;

    endpoints: {
        s3: boolean;
        dynamodb: boolean;
    };
}

export class Vpc extends ComponentResource {
    vpc: aws.ec2.Vpc;
    privateZone: aws.route53.Zone;
    dhcpOptionSet: aws.ec2.VpcDhcpOptions;
    internetGateway: aws.ec2.InternetGateway;
    publicSubnets: aws.ec2.Subnet[] = [];
    privateSubnets: aws.ec2.Subnet[] = [];
    publicRouteTable: aws.ec2.RouteTable;
    privateRouteTables: aws.ec2.RouteTable[] = [];
    natGateways: aws.ec2.NatGateway[] = [];
    natElasticIpAddresses: aws.ec2.Eip[] = [];

    flowLogsGroup: aws.cloudwatch.LogGroup;
    flowLogsRole: aws.iam.Role;

    private name: string;
    private baseTags: aws.Tags;

    /**
     * Returns the IDs of the private subnets in this VPC.
     */
    public privateSubnetIds(): Output<string>[] {
        return this.privateSubnets.map(x => x.id);
    }

    /**
     * Returns the IDs of the public subnets in this VPC.
     */
    public publicSubnetIds(): Output<string>[] {
        return this.publicSubnets.map(x => x.id);
    }

    /**
     * Returns the ID of this VPC.
     */
    public vpcId(): Output<string> {
        return this.vpc.id;
    }

    constructor(name: string, args: VpcArgs, opts?: ComponentResourceOptions) {
        super("vpc", name, {}, opts);

        this.name = name;
        this.baseTags = args.baseTags;

        // VPC
        this.vpc = new aws.ec2.Vpc(`${name}-vpc`, {
            cidrBlock: args.baseCidr,
            enableDnsSupport: true,
            enableDnsHostnames: true,
            tags: {
                ...args.baseTags,
                Name: `${args.description}`,
            },
        }, { parent: this });

        // Internet Gateway
        this.internetGateway = new aws.ec2.InternetGateway(`${name}-igw`, {
            vpcId: this.vpc.id,
            tags: {
                ...args.baseTags,
                Name: `${args.description} VPC Internet Gateway`,
            },
        }, { parent: this.vpc });

        // Calculate subnet address spaces and create subnets
        {
            const distributor = new SubnetDistributor(args.baseCidr, args.availabilityZoneNames.length);
            this.publicSubnets = distributor.publicSubnets().map((cidr, index) => {
                return new aws.ec2.Subnet(`${name}-public-${index + 1}`, {
                    vpcId: this.vpc.id,
                    cidrBlock: cidr,
                    mapPublicIpOnLaunch: true,
                    availabilityZone: args.availabilityZoneNames[index],
                    tags: {
                        ...args.baseTags,
                        Name: `${args.description} Public ${index + 1}`,
                    },
                }, { parent: this.vpc });
            });
            this.privateSubnets = distributor.privateSubnets().map((cidr, index) => {
                return new aws.ec2.Subnet(`${name}-private-${index + 1}`, {
                    vpcId: this.vpc.id,
                    cidrBlock: cidr,
                    availabilityZone: args.availabilityZoneNames[index],
                    tags: {
                        ...args.baseTags,
                        Name: `${args.description} Private ${index + 1}`,
                    },
                }, { parent: this.vpc });
            });
        }

        // Adopt the default route table for the VPC, and adapt it for use with public subnets
        {
            this.publicRouteTable = <aws.ec2.RouteTable>new aws.ec2.DefaultRouteTable(`${name}-public-rt`, {
                defaultRouteTableId: this.vpc.defaultRouteTableId,
                tags: {
                    ...args.baseTags,
                    Name: `${args.description} Public Route Table`,
                },
            }, { parent: this.vpc });

            new aws.ec2.Route(`${name}-route-public-sn-to-ig`, {
                routeTableId: this.publicRouteTable.id,
                destinationCidrBlock: "0.0.0.0/0",
                gatewayId: this.internetGateway.id,
            }, { parent: this.publicRouteTable });

            this.publicSubnets.map((subnet, index) => {
                return new aws.ec2.RouteTableAssociation(`${name}-public-rta-${index + 1}`, {
                    subnetId: subnet.id,
                    routeTableId: this.publicRouteTable.id,
                }, { parent: this.publicRouteTable });
            });
        }

        // Create a NAT Gateway and appropriate route table for each private subnet
        for (let index = 0; index < this.privateSubnets.length; index++) {
            const privateSubnet = this.privateSubnets[index];
            const publicSubnet = this.publicSubnets[index];

            this.natElasticIpAddresses.push(new aws.ec2.Eip(`${name}-nat-${index + 1}`, {
                vpc: true,
                tags: {
                    ...args.baseTags,
                    Name: `${args.description} NAT Gateway EIP ${index + 1}`,
                },
            }, { parent: privateSubnet }));

            this.natGateways.push(new aws.ec2.NatGateway(`${name}-nat-gateway-${index + 1}`, {
                allocationId: this.natElasticIpAddresses[index].id,
                subnetId: publicSubnet.id,
                tags: {
                    ...args.baseTags,
                    Name: `${args.description} NAT Gateway ${index + 1}`,
                },
            }, { parent: privateSubnet }));

            this.privateRouteTables.push(new aws.ec2.RouteTable(`${name}-private-rt-${index + 1}`, {
                vpcId: this.vpc.id,
                tags: {
                    ...args.baseTags,
                    Name: `${args.description} Private Subnet RT ${index + 1}`,
                },
            }, { parent: privateSubnet }));

            new aws.ec2.Route(`${name}-route-private-sn-to-nat-${index + 1}`, {
                routeTableId: this.privateRouteTables[index].id,
                destinationCidrBlock: "0.0.0.0/0",
                natGatewayId: this.natGateways[index].id,
            }, { parent: this.privateRouteTables[index] });

            new aws.ec2.RouteTableAssociation(`${name}-private-rta-${index + 1}`, {
                subnetId: privateSubnet.id,
                routeTableId: this.privateRouteTables[index].id,
            }, { parent: this.privateRouteTables[index] });
        }

        if (args.endpoints.s3) {
            new aws.ec2.VpcEndpoint(`${name}-s3-endpoint`, {
                vpcId: this.vpc.id,
                serviceName: `com.amazonaws.${aws.config.region}.s3`,
                routeTableIds: [this.publicRouteTable.id, ...this.privateRouteTables.map(x => x.id)],
            }, { parent: this.vpc });
        }

        if (args.endpoints.dynamodb) {
            new aws.ec2.VpcEndpoint(`${name}-dynamodb-endpoint`, {
                vpcId: this.vpc.id,
                serviceName: `com.amazonaws.${aws.config.region}.dynamodb`,
                routeTableIds: [this.publicRouteTable.id, ...this.privateRouteTables.map(x => x.id)],
            }, { parent: this.vpc });
        }

        if (args.enableFlowLogs) {
            this.flowLogsRole = new aws.iam.Role(`${name}-flow-logs-role`, {
                description: `${args.description} Flow Logs`,
                assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(aws.iam.Principals.VpcFlowLogsPrincipal),
            }, { parent: this.vpc });

            this.flowLogsGroup = new aws.cloudwatch.LogGroup(`${name}-vpc-flow-logs`, {
                tags: {
                    ...args.baseTags,
                    Name: `${args.description} VPC Flow Logs`,
                },
            }, { parent: this.flowLogsRole });

            new aws.iam.RolePolicy(`${name}-flow-log-policy`, {
                name: "vpc-flow-logs",
                role: this.flowLogsRole.id,
                policy: {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Effect: "Allow",
                            Resource: "*",
                            Action: [
                                "logs:CreateLogGroup",
                                "logs:CreateLogStream",
                                "logs:PutLogEvents",
                                "logs:DescribeLogGroups",
                                "logs:DescribeLogStreams",
                            ],
                        },
                    ],
                },
            }, { parent: this.flowLogsRole });

            new aws.ec2.FlowLog(`${name}-flow-logs`, {
                logDestination: this.flowLogsGroup.arn,
                iamRoleArn: this.flowLogsRole.arn,
                vpcId: this.vpc.id,
                trafficType: "ALL",
            }, { parent: this.flowLogsRole });
        }

        this.registerOutputs({});
    }

    public createPeeredSecurityGroup(args: PeerSecurityGroupArgs) {
        const peeredVpcName = args.peeredVpc.name;

        const sg = new aws.ec2.SecurityGroup(`${this.name}-${peeredVpcName}-sg`, {
            description: `Security Group that allows traffic between ${this.name} and ${peeredVpcName}`,
            egress: [
                { cidrBlocks: ["0.0.0.0/0"], fromPort: 0, protocol: "-1", toPort: 0 },
            ],
            ingress: [
                { cidrBlocks: [args.peeredVpc.vpc.cidrBlock], fromPort: 0, toPort: 0, protocol: "-1" },
            ],
            vpcId: this.vpcId(),
        }, { parent: this });

        return sg.id;
    }

    /**
     * Configures peering of the VPC created by this component to another VPC.
     *
     * @param args The arguments necessary to configure a VPC peering.
     */
    public configurePeering(args: PeerToArgs) {
        let autoAccept = false;
        let peerOwner = args.peerOwnerId;
        if (!args.peerOwnerId) {
            peerOwner = aws.getCallerIdentity({}, { async: true }).then(i => i.accountId);
            autoAccept = true;
        }
        const peerName = args.peerVpc.name;

        const peering = new aws.ec2.VpcPeeringConnection(`${this.name}-peer-to-${peerName}`, {
            vpcId: this.vpc.id,
            peerVpcId: args.peerVpc.vpc.id,
            peerOwnerId: peerOwner,
            autoAccept: autoAccept,
            accepter: {
                allowRemoteVpcDnsResolution: true,
            },
            tags: {
                ...this.baseTags,
                Name: args.nameTag,
            },
        }, {
                parent: this,
            });

        let primaryRouteTableIds: aws.ec2.RouteTable[] = [];
        if (args.routeSubnets) {
            switch (args.routeSubnets) {
                case "private":
                    primaryRouteTableIds = this.privateRouteTables;
                    break;
                case "public":
                    primaryRouteTableIds = [this.publicRouteTable];
                    break;
                case "all":
                default:
                    primaryRouteTableIds = [...this.privateRouteTables, this.publicRouteTable];
                    break;
            }
        }

        primaryRouteTableIds.forEach((rt, index) => {
            new aws.ec2.Route(`${this.name}-peer-to-${peerName}-route-${index + 1}`, {
                routeTableId: rt.id,
                destinationCidrBlock: args.peerVpc.vpc.cidrBlock,
                vpcPeeringConnectionId: peering.id,
            }, {
                    parent: peering,
                });
        });

        let secondaryRouteTableIds: aws.ec2.RouteTable[] = [];
        if (args.routeSubnets) {
            switch (args.routeSubnets) {
                case "private":
                    secondaryRouteTableIds = args.peerVpc.privateRouteTables;
                    break;
                case "public":
                    secondaryRouteTableIds = [args.peerVpc.publicRouteTable];
                    break;
                case "all":
                default:
                    secondaryRouteTableIds = [...args.peerVpc.privateRouteTables, args.peerVpc.publicRouteTable];
                    break;
            }
        }

        secondaryRouteTableIds.forEach((rt, index) => {
            new aws.ec2.Route(`${peerName}-peer-to-${this.name}-route-${index + 1}`, {
                routeTableId: rt.id,
                destinationCidrBlock: this.vpc.cidrBlock,
                vpcPeeringConnectionId: peering.id,
            }, {
                    parent: peering,
                });
        });
    }
}

interface PeerSecurityGroupArgs {
    /**
     * The peered VPC to which we allow traffic from.
     */
    peeredVpc: Vpc;
}

interface PeerToArgs {
    /**
     * An instance of VPC for which to configure peering.
     */
    peerVpc: Vpc;
    /**
     * The text to use for the Name tag of the peering connection.
     */
    nameTag: string;
    /**
     * The owner of the peer VPC. If this is not set, the current account
     * is obtained via a call to aws.getCallerIdentity.
     */
    peerOwnerId?: Input<string>;
    /**
     * Subnet classes in which to configure routes from this to the remote VPC.
     * Defaults to "all".
     */
    routeSubnets?: "private" | "public" | "all";
}

/**
 * A SubnetDistributor is used to split a given CIDR block into a number of
 * subnets and calculate the address spaces to use for each. Since AWS now allows
 * for additional address spaces to be attached to an existing VPC, we do not
 * reserve any additional space.
 */
class SubnetDistributor {
    private readonly _privateSubnets: string[];
    private readonly _publicSubnets: string[];

    /**
     * Creates a subnet distributor configured to split the baseCidr into a fixed
     * number of public/private subnet pairs.
     * @param {string} baseCidr The CIDR block to split.
     * @param {number} azCount The number of subnet pairs to produce.
     */
    constructor(baseCidr: string, azCount: number) {
        const newBitsPerAZ = Math.log2(SubnetDistributor.nextPow2(azCount));

        const azBases: string[] = [];
        for (let i = 0; i < azCount; i++) {
            azBases.push(SubnetDistributor.subnetV4(baseCidr, newBitsPerAZ, i));
        }

        this._privateSubnets = azBases.map((block) => {
            return SubnetDistributor.subnetV4(block, 1, 0);
        });

        this._publicSubnets = this._privateSubnets.map((block) => {
            const splitBase = SubnetDistributor.subnetV4(block, 0, 1);
            return SubnetDistributor.subnetV4(splitBase, 2, 0);
        });
    }

    /**
     * Returns an array of the CIDR blocks for the private subnets.
     * @returns {string[]}
     */
    public privateSubnets(): string[] {
        return this._privateSubnets;
    }

    /**
     * Returns an array of the CIDR blocks for the public subnets.
     * @returns {string[]}
     */
    public publicSubnets(): string[] {
        return this._publicSubnets;
    }

    /**
     * Constructs a CIDR address based on a block, number of new bits, and network number
     * @param ipRange
     * @param newBits
     * @param netNum
     */
    /** @internal */
    private static subnetV4(ipRange: string, newBits: number, netNum: number): string {
        const ipAddress = require("ip-address");
        const BigInteger = require("jsbn").BigInteger;

        const ipv4 = new ipAddress.Address4(ipRange);
        if (!ipv4.isValid()) {
            throw new Error(`Invalid IP address range: ${ipRange}`);
        }

        const newSubnetMask = ipv4.subnetMask + newBits;
        if (newSubnetMask > 32) {
            throw new Error(`Requested ${newBits} new bits, but ` +
                `only ${32 - ipv4.subnetMask} are available.`);
        }

        const addressBI = ipv4.bigInteger();
        const newAddressBase = Math.pow(2, 32 - newSubnetMask);
        const netNumBI = new BigInteger(netNum.toString());

        const newAddressBI = addressBI.add(new BigInteger(newAddressBase.toString()).multiply(netNumBI));
        const newAddress = ipAddress.Address4.fromBigInteger(newAddressBI).address;

        return `${newAddress}/${newSubnetMask}`;
    }

    /**
     * nextPow2 returns the next integer greater or equal to n which is a power of 2.
     * @param {number} n input number
     * @returns {number} next power of 2 to n (>= n)
     */
    /** @internal */
    private static nextPow2(n: number): number {
        if (n === 0) {
            return 1;
        }

        n--;
        n |= n >> 1;
        n |= n >> 2;
        n |= n >> 4;
        n |= n >> 8;
        n |= n >> 16;

        return n + 1;
    }
}

