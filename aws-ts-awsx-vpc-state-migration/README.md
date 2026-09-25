# Migrating an AWSX VPC with component state migrations

Migrate an existing VPC from classic AWSX to modern AWSX, then to plain AWS resources, while preserving its physical resources. Each stage is a standalone Pulumi project with the same project name. Run the stages against the **same stack and backend**.

- [v1: Classic AWSX VPC](v1/) creates the starting infrastructure.
- [v2: Modern AWSX VPC](v2/) migrates the classic component and its children.
- [v3: Plain AWS resources](v3/) removes the AWSX component. It includes both migrations, so it also supports upgrading directly from v1.

The example creates one isolated subnet, a route table and association, an internet gateway, and a security group. It creates no NAT gateways. The security group lives outside the migrated subtree and continues to reference the same VPC.

These migrations handle this example's specific resource names and single-subnet layout. They are not a general migration for arbitrary AWSX VPCs with additional subnets, NAT gateways, routes, or endpoints.

## Understanding the migrations

The programs use `ResourceOptions.stateMigrations`. Each callback receives the prior subtree in `args.oldState` and returns:

- `newState`: the complete replacement subtree, including retained resource IDs, provider properties, and lifecycle settings.
- `successors`: a map from each removed URN to its replacement. Multiple old resources can share a successor when a component wrapper is folded into its managed child.

Aliases let Pulumi find a resource under its historical type before running the callbacks. Pulumi uses the successor mappings to rewrite references, including dependencies from resources outside the subtree. The callbacks clone the old states and explicitly change their URNs, types, and parents. They do not call providers or create resources.

The VPC subtree changes as follows (the stack-level security group is omitted):

```text
v1: awsx:x:ec2:Vpc "vpc"
    ├── aws:ec2/vpc:Vpc "vpc"
    ├── awsx:x:ec2:Subnet "vpc-isolated-0"
    │   ├── aws:ec2/subnet:Subnet "vpc-isolated-0"
    │   ├── aws:ec2/routeTable:RouteTable "vpc-isolated-0"
    │   └── aws:ec2/routeTableAssociation:RouteTableAssociation "vpc-isolated-0"
    └── awsx:x:ec2:InternetGateway "vpc"
        └── aws:ec2/internetGateway:InternetGateway "vpc"

v2: awsx:ec2:Vpc "vpc"
    └── aws:ec2/vpc:Vpc "vpc"
        ├── aws:ec2/subnet:Subnet "vpc-isolated-1"
        │   └── aws:ec2/routeTable:RouteTable "vpc-isolated-1"
        │       └── aws:ec2/routeTableAssociation:RouteTableAssociation "vpc-isolated-1"
        └── aws:ec2/internetGateway:InternetGateway "vpc"

v3: aws:ec2/vpc:Vpc "vpc"
    ├── aws:ec2/subnet:Subnet "vpc-isolated-1"
    │   └── aws:ec2/routeTable:RouteTable "vpc-isolated-1"
    │       └── aws:ec2/routeTableAssociation:RouteTableAssociation "vpc-isolated-1"
    └── aws:ec2/internetGateway:InternetGateway "vpc"
```
