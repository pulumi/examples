from pulumi_aws import ec2

REGION = "us-east-2"

## VPC

vpc = ec2.Vpc(
    'eks-vpc', 
    cidr_block='10.100.0.0/16',
    instance_tenancy='default',
    enable_dns_hostnames=True,
    enable_dns_support=True,
    tags={
        'Name' : 'pulumi-eks-vpc',
        'kubernetes.io/cluster/pulumi-eks-cluster' : 'shared'
    }
)

igw = ec2.InternetGateway(
    'vpc-ig',
    vpc_id=vpc.id,
    tags={
        'Name' : 'pulumi-vpc-ig'
    }
)

## Subnets

vpc_subnet_1 = ec2.Subnet(
    'vpc-sn-1', 
    assign_ipv6_address_on_creation=False,
    vpc_id=vpc.id,
    map_public_ip_on_launch=True,
    cidr_block='10.100.1.0/24',
    availability_zone= REGION + "b",
    tags={
        'Name' : 'pulumi-sn-1',
        'kubernetes.io/cluster/pulumi-eks-cluster' : 'shared'
    }
)

vpc_subnet_2 = ec2.Subnet(
    'vpc-sn-2', 
    assign_ipv6_address_on_creation=False,
    vpc_id=vpc.id,
    map_public_ip_on_launch=True,
    cidr_block='10.100.0.0/24',
    availability_zone= REGION + "a",
    tags={
        'Name' : 'pulumi-sn-2',
        'kubernetes.io/cluster/pulumi-eks-cluster' : 'shared'
    }
)

eks_route_table = ec2.RouteTable(
    'vpc-route-table',
    vpc_id=vpc.id,
    routes=[{
            'cidr_block' : '0.0.0.0/0',
            'gateway_id' : igw.id
        }
    ],
    tags={
        'Name' : 'pulumi-vpc-rt'
    }
)

ec2.RouteTableAssociation(
    'vpc-1-route-table-assoc',
    route_table_id=eks_route_table.id,
    subnet_id=vpc_subnet_1.id,
)

ec2.RouteTableAssociation(
    'vpc-2-route-table-assoc',
    route_table_id=eks_route_table.id,
    subnet_id=vpc_subnet_2.id,
)

## Security Groups

eks_security_group = ec2.SecurityGroup(
    "eks-cluster-sg",
    vpc_id=vpc.id,
    description='Allow all HTTP(s) traffic to EKS Cluster',
    tags={
        'Name' : 'pulumi-cluster-sg'
    },
    ingress=[{
            'cidr_blocks' : ["0.0.0.0/0"],
            'from_port' : '443',
            'to_port' : '443',
            'protocol' : 'tcp',
            'description' : 'Allow pods to communicate with the cluster API Server.'
        },
        {
            'cidr_blocks' : ["0.0.0.0/0"],
            'from_port' : '80',
            'to_port' : '80',
            'protocol' : 'tcp',
            'description' : 'Allow internet access to pods'
        }
    ]
)
