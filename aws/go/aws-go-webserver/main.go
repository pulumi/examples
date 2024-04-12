package main

import (
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Create a new security group for port 80.
		group, err := ec2.NewSecurityGroup(ctx, "web-secgrp", &ec2.SecurityGroupArgs{
			Ingress: ec2.SecurityGroupIngressArray{
				ec2.SecurityGroupIngressArgs{
					Protocol:   pulumi.String("tcp"),
					FromPort:   pulumi.Int(80),
					ToPort:     pulumi.Int(80),
					CidrBlocks: pulumi.StringArray{pulumi.String("0.0.0.0/0")},
				},
			},
		})
		if err != nil {
			return err
		}

		// Get the ID for the latest Amazon Linux AMI.
		mostRecent := true
		ami, err := ec2.LookupAmi(ctx, &ec2.LookupAmiArgs{
			Filters: []ec2.GetAmiFilter{
				{
					Name:   "name",
					Values: []string{"amzn-ami-hvm-*-x86_64-ebs"},
				},
			},
			Owners:     []string{"137112412989"},
			MostRecent: &mostRecent,
		})
		if err != nil {
			return err
		}

		// Create a simple web server using the startup script for the instance.
		srv, err := ec2.NewInstance(ctx, "web-server-www", &ec2.InstanceArgs{
			Tags:                pulumi.StringMap{"Name": pulumi.String("web-server-www")},
			InstanceType:        pulumi.String("t2.micro"), // t2.micro is available in the AWS free tier.
			VpcSecurityGroupIds: pulumi.StringArray{group.ID()},
			Ami:                 pulumi.String(ami.Id),
			UserData: pulumi.String(`#!/bin/bash
echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &`),
		})

		// Export the resulting server's IP address and DNS name.
		ctx.Export("publicIp", srv.PublicIp)
		ctx.Export("publicHostName", srv.PublicDns)
		return nil
	})
}
