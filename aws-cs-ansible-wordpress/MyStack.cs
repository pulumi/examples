// Copyright 2022, Pulumi Corporation.

using System.IO;
using Pulumi;
using Aws = Pulumi.Aws;
using Command = Pulumi.Command;

class MyStack : Stack
{
    public MyStack()
    {
        var config = new Config();
        // A path to the EC2 keypair's public key:
        var publicKeyPath = config.Require("publicKeyPath");
        // A path to the EC2 keypair's private key:
        var privateKeyPath = config.Require("privateKeyPath");
        // The WordPress database size:
        var dbInstanceSize = config.Get("dbInstanceSize") ?? "db.t3.small";
        // The WordPress database name:
        var dbName = config.Get("dbName") ?? "wordpressdb";
        // The WordPress database user's name:
        var dbUsername = config.Get("dbUsername") ?? "admin";
        // The WordPress database user's password:
        var dbPassword = config.RequireSecret("dbPassword");
        // The WordPress EC2 instance's size:
        var ec2InstanceSize = config.Get("ec2InstanceSize") ?? "t3.small";

        // Dynamically fetch AZs so we can spread across them.
        var availabilityZones = Aws.GetAvailabilityZones.Invoke();
        // Dynamically query for the Amazon Linux 2 AMI in this region.
        var awsLinuxAmi = Aws.Ec2.GetAmi.Invoke(new Aws.Ec2.GetAmiInvokeArgs
        {
            Owners = { "amazon" },
            Filters =
            {
                new Aws.Ec2.Inputs.GetAmiFilterInputArgs
                {
                    Name = "name",
                    Values = { "amzn2-ami-hvm-*-x86_64-ebs" },
                },
            },
            MostRecent = true,
        });

        // Read in the public key for easy use below.
        var publicKey = File.ReadAllText(publicKeyPath);
        // Read in the private key for easy use below (and to ensure it's marked a secret!)
        var privateKey = Output.CreateSecret(File.ReadAllText(privateKeyPath));

        // Set up a Virtual Private Cloud to deploy our EC2 instance and RDS datbase into.
        var prodVpc = new Aws.Ec2.Vpc("prod-vpc", new Aws.Ec2.VpcArgs
        {
            CidrBlock = "10.192.0.0/16",
            EnableDnsSupport = true, // gives you an internal domain name.
            EnableDnsHostnames = true, // gives you an internal host name.
            EnableClassiclink = false,
            InstanceTenancy = "default",
        });

        // Create public subnets for the EC2 instance.
        var prodSubnetPublic1 = new Aws.Ec2.Subnet("prod-subnet-public-1", new Aws.Ec2.SubnetArgs
        {
            VpcId = prodVpc.Id,
            CidrBlock = "10.192.0.0/24",
            MapPublicIpOnLaunch = true, // public
            AvailabilityZone = availabilityZones.Apply(az => az.Names[0]),
        });

        // Create private subnets for RDS:
        var prodSubnetPrivate1 = new Aws.Ec2.Subnet("prod-subnet-private-1", new Aws.Ec2.SubnetArgs
        {
            VpcId = prodVpc.Id,
            CidrBlock = "10.192.20.0/24",
            MapPublicIpOnLaunch = false, // private
            AvailabilityZone = availabilityZones.Apply(az => az.Names[1]),
        });
        var prodSubnetPrivate2 = new Aws.Ec2.Subnet("prod-subnet-private-2", new Aws.Ec2.SubnetArgs
        {
            VpcId = prodVpc.Id,
            CidrBlock = "10.192.21.0/24",
            MapPublicIpOnLaunch = false, // private
            AvailabilityZone = availabilityZones.Apply(az => az.Names[2]),
        });

        // Create a gateway for internet connectivity:
        var prodIgw = new Aws.Ec2.InternetGateway("prod-igw", new Aws.Ec2.InternetGatewayArgs
        {
            VpcId = prodVpc.Id,
        });

        // Create and associate a route table:
        var prodPublicCrt = new Aws.Ec2.RouteTable("prod-public-crt", new Aws.Ec2.RouteTableArgs
        {
            VpcId = prodVpc.Id,
            Routes =
            {
                new Aws.Ec2.Inputs.RouteTableRouteArgs
                {
                    // associated subnets can reach anywhere.
                    CidrBlock = "0.0.0.0/0",
                    // use this IGW to reach the internet.
                    GatewayId = prodIgw.Id,
                },
            },
        });
        var prodCrtaPublicSubnet1 = new Aws.Ec2.RouteTableAssociation("prod-crta-public-subnet-1", new Aws.Ec2.RouteTableAssociationArgs
        {
            SubnetId = prodSubnetPublic1.Id,
            RouteTableId = prodPublicCrt.Id,
        });

        // Security group for EC2:
        var ec2AllowRule = new Aws.Ec2.SecurityGroup("ec2-allow-rule", new Aws.Ec2.SecurityGroupArgs
        {
            VpcId = prodVpc.Id,
            Ingress =
            {
                new Aws.Ec2.Inputs.SecurityGroupIngressArgs
                {
                    Description = "HTTPS",
                    FromPort = 443,
                    ToPort = 443,
                    Protocol = "tcp",
                    CidrBlocks =
                    {
                        "0.0.0.0/0",
                    },
                },
                new Aws.Ec2.Inputs.SecurityGroupIngressArgs
                {
                    Description = "HTTP",
                    FromPort = 80,
                    ToPort = 80,
                    Protocol = "tcp",
                    CidrBlocks =
                    {
                        "0.0.0.0/0",
                    },
                },
                new Aws.Ec2.Inputs.SecurityGroupIngressArgs
                {
                    Description = "SSH",
                    FromPort = 22,
                    ToPort = 22,
                    Protocol = "tcp",
                    CidrBlocks =
                    {
                        "0.0.0.0/0",
                    },
                },
            },
            Egress =
            {
                new Aws.Ec2.Inputs.SecurityGroupEgressArgs
                {
                    FromPort = 0,
                    ToPort = 0,
                    Protocol = "-1",
                    CidrBlocks =
                    {
                        "0.0.0.0/0",
                    },
                },
            },
            Tags =
            {
                { "Name", "allow ssh,http,https" },
            },
        });

        // Security group for RDS:
        var rdsAllowRule = new Aws.Ec2.SecurityGroup("rds-allow-rule", new Aws.Ec2.SecurityGroupArgs
        {
            VpcId = prodVpc.Id,
            Ingress =
            {
                new Aws.Ec2.Inputs.SecurityGroupIngressArgs
                {
                    Description = "MySQL",
                    FromPort = 3306,
                    ToPort = 3306,
                    Protocol = "tcp",
                    SecurityGroups =
                    {
                        ec2AllowRule.Id,
                    },
                },
            },
            // Allow all outbound traffic.
            Egress =
            {
                new Aws.Ec2.Inputs.SecurityGroupEgressArgs
                {
                    FromPort = 0,
                    ToPort = 0,
                    Protocol = "-1",
                    CidrBlocks =
                    {
                        "0.0.0.0/0",
                    },
                },
            },
            Tags =
            {
                { "Name", "allow ec2" },
            },
        });

        // Place the RDS instance into private subnets:
        var rdsSubnetGrp = new Aws.Rds.SubnetGroup("rds-subnet-grp", new Aws.Rds.SubnetGroupArgs
        {
            SubnetIds =
            {
                prodSubnetPrivate1.Id,
                prodSubnetPrivate2.Id,
            },
        });

        // Create the RDS instance:
        var wordpressdb = new Aws.Rds.Instance("wordpressdb", new Aws.Rds.InstanceArgs
        {
            AllocatedStorage = 10,
            Engine = "mysql",
            EngineVersion = "5.7",
            InstanceClass = dbInstanceSize,
            DbSubnetGroupName = rdsSubnetGrp.Id,
            VpcSecurityGroupIds =
            {
                rdsAllowRule.Id,
            },
            DbName = dbName,
            Username = dbUsername,
            Password = dbPassword,
            SkipFinalSnapshot = true,
        });

        // Create a keypair to access the EC2 instance:
        var wordpressKeypair = new Aws.Ec2.KeyPair("wordpress-keypair", new Aws.Ec2.KeyPairArgs
        {
            PublicKey = publicKey,
        });

        // Create an EC2 instance to run Wordpress (after RDS is ready).
        var wordpressInstance = new Aws.Ec2.Instance("wordpress-instance", new Aws.Ec2.InstanceArgs
        {
            Ami = awsLinuxAmi.Apply(awsLinuxAmi => awsLinuxAmi.Id),
            InstanceType = ec2InstanceSize,
            SubnetId = prodSubnetPublic1.Id,
            VpcSecurityGroupIds =
            {
                ec2AllowRule.Id,
            },
            KeyName = wordpressKeypair.Id,
            Tags =
            {
                { "Name", "Wordpress.web" },
            },
        }, new CustomResourceOptions
        {
            // Only create after RDS is provisioned.
            DependsOn = { wordpressdb },
        });

        // Give our EC2 instance an elastic IP address.
        var wordpressEip = new Aws.Ec2.Eip("wordpress-eip", new Aws.Ec2.EipArgs
        {
            Instance = wordpressInstance.Id,
        });

        // Render the Ansible playbook using RDS info.
        var renderPlaybookCmd = new Command.Local.Command("renderPlaybookCmd", new Command.Local.CommandArgs
        {
            Create = "cat playbook.yml | envsubst > playbook_rendered.yml",
            Environment =
            {
                { "DB_RDS", wordpressdb.Endpoint },
                { "DB_NAME", dbName },
                { "DB_USERNAME", dbUsername },
                { "DB_PASSWORD", dbPassword },
            },
        });

        // Run a script to update packages on the remote machine.
        var updatePythonCmd = new Command.Remote.Command("updatePythonCmd", new Command.Remote.CommandArgs
        {
            Connection = new Command.Remote.Inputs.ConnectionArgs
            {
                Host = wordpressEip.PublicIp,
                Port = 22,
                User = "ec2-user",
                PrivateKey = privateKey,
            },
            Create = "(sudo yum update -y || true);"+
                "(sudo yum install python35 -y);"+
                "(sudo yum install amazon-linux-extras -y)"
        });

        var playAnsiblePlaybookCmd = new Command.Local.Command("playAnsiblePlaybookCmd", new Command.Local.CommandArgs
        {
            Create = wordpressEip.PublicIp.Apply(publicIp =>
                $"ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook "+
                    $"-u ec2-user "+
                    $"-i '{publicIp},' "+
                    $"--private-key {privateKeyPath} "+
                    $"playbook_rendered.yml"),
        }, new CustomResourceOptions
        {
            DependsOn =
            {
                renderPlaybookCmd,
                updatePythonCmd,
            },
        });

        // Export the resulting wordpress EIP for easy access.
        this.Url = wordpressEip.PublicIp;
    }

    [Output("url")]
    public Output<string> Url { get; set; }
}
