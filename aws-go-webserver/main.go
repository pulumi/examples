package main

import (
	"github.com/pulumi/pulumi-aws/sdk/v4/go/aws/ec2"
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
		ami := ec2.LookupAmiOutput(ctx, ec2.LookupAmiOutputArgs{ // here
			Filters: ec2.GetAmiFilterArray{
				ec2.GetAmiFilterArgs{
					Name:   pulumi.String("name"),
					Values: pulumi.StringArray{pulumi.String("amzn-ami-hvm-*-x86_64-ebs")},
				},
			},
			Owners:     pulumi.StringArray{pulumi.String("137112412989")},
			MostRecent: pulumi.Bool(mostRecent),
		})

		// Create a simple web server using the startup script for the instance.
		srv, err := ec2.NewInstance(ctx, "web-server-www", &ec2.InstanceArgs{
			Tags:                pulumi.StringMap{"Name": pulumi.String("web-server-www")},
			InstanceType:        pulumi.String("t2.micro"), // t2.micro is available in the AWS free tier.
			VpcSecurityGroupIds: pulumi.StringArray{group.ID()},
			Ami:                 ami.Id(),
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
