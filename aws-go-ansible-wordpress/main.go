// Copyright 2022, Pulumi Corporation.

package main

import (
	"fmt"
	"io/ioutil"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/rds"
	"github.com/pulumi/pulumi-command/sdk/go/command/local"
	"github.com/pulumi/pulumi-command/sdk/go/command/remote"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi/config"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		cfg := config.New(ctx, "")
		// A path to the EC2 keypair's public key:
		publicKeyPath := cfg.Require("publicKeyPath")
		// A path to the EC2 keypair's private key:
		privateKeyPath := cfg.Require("privateKeyPath")
		//  The WordPress database size:
		dbInstanceSize := cfg.Get("dbInstanceSize")
		if dbInstanceSize == "" {
			dbInstanceSize = "db.t3.small"
		}
		// The WordPress database name:
		dbName := cfg.Get("dbName")
		if dbName == "" {
			dbName = "wordpressdb"
		}
		// The WordPress database user's name:
		dbUsername := cfg.Get("dbUsername")
		if dbUsername == "" {
			dbUsername = "admin"
		}
		//  The WordPress database user's password:
		dbPassword := cfg.RequireSecret("dbPassword")
		// The WordPress EC2 instance's size:
		ec2InstanceSize := cfg.Get("ec2InstanceSize")
		if ec2InstanceSize == "" {
			ec2InstanceSize = "t3.small"
		}

		// Dynamically fetch AZs so we can spread across them.
		availabilityZones, err := aws.GetAvailabilityZones(ctx, nil)
		if err != nil {
			return err
		}
		// Dynamically query for the Amazon Linux 2 AMI in this region.
		awsLinuxAmi, err := ec2.LookupAmi(ctx, &ec2.LookupAmiArgs{
			Owners: []string{
				"amazon",
			},
			Filters: []ec2.GetAmiFilter{
				ec2.GetAmiFilter{
					Name: "name",
					Values: []string{
						"amzn2-ami-hvm-*-x86_64-ebs",
					},
				},
			},
			MostRecent: pulumi.BoolRef(true),
		}, nil)
		if err != nil {
			return err
		}

		// Read in the public key for easy use below.
		publicKeyBytes, err := ioutil.ReadFile(publicKeyPath)
		if err != nil {
			return err
		}
		publicKey := pulumi.String(string(publicKeyBytes))
		// Read in the private key for easy use below (and to ensure it's marked a secret!)
		privateKeyBytes, err := ioutil.ReadFile(privateKeyPath)
		if err != nil {
			return err
		}
		privateKey := pulumi.ToSecret(string(privateKeyBytes)).(pulumi.StringOutput)

		// Set up a Virtual Private Cloud to deploy our EC2 instance and RDS datbase into.
		prodVpc, err := ec2.NewVpc(ctx, "prod-vpc", &ec2.VpcArgs{
			CidrBlock:          pulumi.String("10.192.0.0/16"),
			EnableDnsSupport:   pulumi.Bool(true), // gives you an internal domain name.
			EnableDnsHostnames: pulumi.Bool(true), // gives you an internal host name.
			EnableClassiclink:  pulumi.Bool(false),
			InstanceTenancy:    pulumi.String("default"),
		})
		if err != nil {
			return err
		}
		// Create public subnets for the EC2 instance.
		prodSubnetPublic1, err := ec2.NewSubnet(ctx, "prod-subnet-public-1", &ec2.SubnetArgs{
			VpcId:               prodVpc.ID(),
			CidrBlock:           pulumi.String("10.192.0.0/24"),
			MapPublicIpOnLaunch: pulumi.Bool(true), // public
			AvailabilityZone:    pulumi.String(availabilityZones.Names[0]),
		})
		if err != nil {
			return err
		}
		// Create private subnets for RDS:
		prodSubnetPrivate1, err := ec2.NewSubnet(ctx, "prod-subnet-private-1", &ec2.SubnetArgs{
			VpcId:               prodVpc.ID(),
			CidrBlock:           pulumi.String("10.192.20.0/24"),
			MapPublicIpOnLaunch: pulumi.Bool(false), // private
			AvailabilityZone:    pulumi.String(availabilityZones.Names[1]),
		})
		if err != nil {
			return err
		}
		prodSubnetPrivate2, err := ec2.NewSubnet(ctx, "prod-subnet-private-2", &ec2.SubnetArgs{
			VpcId:               prodVpc.ID(),
			CidrBlock:           pulumi.String("10.192.21.0/24"),
			MapPublicIpOnLaunch: pulumi.Bool(false), // private
			AvailabilityZone:    pulumi.String(availabilityZones.Names[2]),
		})
		if err != nil {
			return err
		}
		// Create a gateway for internet connectivity:
		prodIgw, err := ec2.NewInternetGateway(ctx, "prod-igw", &ec2.InternetGatewayArgs{
			VpcId: prodVpc.ID(),
		})
		if err != nil {
			return err
		}
		// Create a route table:
		prodPublicRt, err := ec2.NewRouteTable(ctx, "prod-public-rt", &ec2.RouteTableArgs{
			VpcId: prodVpc.ID(),
			Routes: ec2.RouteTableRouteArray{
				&ec2.RouteTableRouteArgs{
					// associated subnets can reach anywhere.
					CidrBlock: pulumi.String("0.0.0.0/0"),
					// use this IGW to reach the internet.
					GatewayId: prodIgw.ID(),
				},
			},
		})
		if err != nil {
			return err
		}
		_, err = ec2.NewRouteTableAssociation(ctx, "prod-rta-public-subnet-1", &ec2.RouteTableAssociationArgs{
			SubnetId:     prodSubnetPublic1.ID(),
			RouteTableId: prodPublicRt.ID(),
		})
		if err != nil {
			return err
		}

		// Security group for EC2:
		ec2AllowRule, err := ec2.NewSecurityGroup(ctx, "ec2-allow-rule", &ec2.SecurityGroupArgs{
			VpcId: prodVpc.ID(),
			Ingress: ec2.SecurityGroupIngressArray{
				&ec2.SecurityGroupIngressArgs{
					Description: pulumi.String("HTTPS"),
					FromPort:    pulumi.Int(443),
					ToPort:      pulumi.Int(443),
					Protocol:    pulumi.String("tcp"),
					CidrBlocks: pulumi.StringArray{
						pulumi.String("0.0.0.0/0"),
					},
				},
				&ec2.SecurityGroupIngressArgs{
					Description: pulumi.String("HTTP"),
					FromPort:    pulumi.Int(80),
					ToPort:      pulumi.Int(80),
					Protocol:    pulumi.String("tcp"),
					CidrBlocks: pulumi.StringArray{
						pulumi.String("0.0.0.0/0"),
					},
				},
				&ec2.SecurityGroupIngressArgs{
					Description: pulumi.String("SSH"),
					FromPort:    pulumi.Int(22),
					ToPort:      pulumi.Int(22),
					Protocol:    pulumi.String("tcp"),
					CidrBlocks: pulumi.StringArray{
						pulumi.String("0.0.0.0/0"),
					},
				},
			},
			Egress: ec2.SecurityGroupEgressArray{
				&ec2.SecurityGroupEgressArgs{
					FromPort: pulumi.Int(0),
					ToPort:   pulumi.Int(0),
					Protocol: pulumi.String("-1"),
					CidrBlocks: pulumi.StringArray{
						pulumi.String("0.0.0.0/0"),
					},
				},
			},
			Tags: pulumi.StringMap{
				"Name": pulumi.String("allow ssh,http,https"),
			},
		})
		if err != nil {
			return err
		}
		// Security group for RDS:
		rdsAllowRule, err := ec2.NewSecurityGroup(ctx, "rds-allow-rule", &ec2.SecurityGroupArgs{
			VpcId: prodVpc.ID(),
			Ingress: ec2.SecurityGroupIngressArray{
				&ec2.SecurityGroupIngressArgs{
					Description: pulumi.String("MySQL"),
					FromPort:    pulumi.Int(3306),
					ToPort:      pulumi.Int(3306),
					Protocol:    pulumi.String("tcp"),
					SecurityGroups: pulumi.StringArray{
						ec2AllowRule.ID(),
					},
				},
			},
			// Allow all outbound traffic.
			Egress: ec2.SecurityGroupEgressArray{
				&ec2.SecurityGroupEgressArgs{
					FromPort: pulumi.Int(0),
					ToPort:   pulumi.Int(0),
					Protocol: pulumi.String("-1"),
					CidrBlocks: pulumi.StringArray{
						pulumi.String("0.0.0.0/0"),
					},
				},
			},
			Tags: pulumi.StringMap{
				"Name": pulumi.String("allow ec2"),
			},
		})
		if err != nil {
			return err
		}

		// Place the RDS instance into private subnets:
		rdsSubnetGrp, err := rds.NewSubnetGroup(ctx, "rds-subnet-grp", &rds.SubnetGroupArgs{
			SubnetIds: pulumi.StringArray{
				prodSubnetPrivate1.ID(),
				prodSubnetPrivate2.ID(),
			},
		})
		if err != nil {
			return err
		}
		// Create the RDS instance:
		wordpressdb, err := rds.NewInstance(ctx, "wordpressdb", &rds.InstanceArgs{
			AllocatedStorage:  pulumi.Int(10),
			Engine:            pulumi.String("mysql"),
			EngineVersion:     pulumi.String("5.7"),
			InstanceClass:     pulumi.String(dbInstanceSize),
			DbSubnetGroupName: rdsSubnetGrp.ID(),
			VpcSecurityGroupIds: pulumi.StringArray{
				rdsAllowRule.ID(),
			},
			DbName:            pulumi.String(dbName),
			Username:          pulumi.String(dbUsername),
			Password:          dbPassword,
			SkipFinalSnapshot: pulumi.Bool(true),
		})
		if err != nil {
			return err
		}

		// Create a keypair to access the EC2 instance:
		wordpressKeypair, err := ec2.NewKeyPair(ctx, "wordpress-keypair", &ec2.KeyPairArgs{
			PublicKey: pulumi.String(publicKey),
		})
		if err != nil {
			return err
		}

		// Create an EC2 instance to run Wordpress (after RDS is ready).
		wordpressInstance, err := ec2.NewInstance(ctx, "wordpress-instance", &ec2.InstanceArgs{
			Ami:          pulumi.String(awsLinuxAmi.Id),
			InstanceType: pulumi.String(ec2InstanceSize),
			SubnetId:     prodSubnetPublic1.ID(),
			VpcSecurityGroupIds: pulumi.StringArray{
				ec2AllowRule.ID(),
			},
			KeyName: wordpressKeypair.ID(),
			Tags: pulumi.StringMap{
				"Name": pulumi.String("Wordpress.web"),
			},
		}, pulumi.DependsOn([]pulumi.Resource{
			// Only create after RDS is provisioned.
			wordpressdb,
		}))
		if err != nil {
			return err
		}

		// Give our EC2 instance an elastic IP address.
		wordpressEip, err := ec2.NewEip(ctx, "wordpress-eip", &ec2.EipArgs{
			Instance: wordpressInstance.ID(),
		})
		if err != nil {
			return err
		}

		// Render the Ansible playbook using RDS info.
		renderPlaybookCmd, err := local.NewCommand(ctx, "renderPlaybookCmd", &local.CommandArgs{
			Create: pulumi.String("cat playbook.yml | envsubst > playbook_rendered.yml"),
			Environment: pulumi.StringMap{
				"DB_RDS":      wordpressdb.Endpoint,
				"DB_NAME":     pulumi.String(dbName),
				"DB_USERNAME": pulumi.String(dbUsername),
				"DB_PASSWORD": dbPassword,
			},
		})
		if err != nil {
			return err
		}

		// Run a script to update packages on the remote machine.
		updatePythonCmd, err := remote.NewCommand(ctx, "updatePythonCmd", &remote.CommandArgs{
			Connection: &remote.ConnectionArgs{
				Host:       wordpressEip.PublicIp,
				Port:       pulumi.Float64(22),
				User:       pulumi.String("ec2-user"),
				PrivateKey: privateKey,
			},
			Create: pulumi.String("(sudo yum update -y || true);" +
				"(sudo yum install python35 -y);" +
				"(sudo yum install amazon-linux-extras -y)\n"),
		})
		if err != nil {
			return err
		}

		// Finally, play the Ansible playbook to finish installing.
		_, err = local.NewCommand(ctx, "playAnsiblePlaybookCmd", &local.CommandArgs{
			Create: wordpressEip.PublicIp.ApplyT(func(publicIp string) (string, error) {
				return fmt.Sprintf("ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook "+
					"-u ec2-user "+
					"-i '%v,' "+
					"--private-key %v "+
					"playbook_rendered.yml", publicIp, privateKeyPath), nil
			}).(pulumi.StringOutput),
		}, pulumi.DependsOn([]pulumi.Resource{
			renderPlaybookCmd,
			updatePythonCmd,
		}))
		if err != nil {
			return err
		}

		// Export the resulting wordpress EIP for easy access.
		ctx.Export("url", wordpressEip.PublicIp)
		return nil
	})
}
