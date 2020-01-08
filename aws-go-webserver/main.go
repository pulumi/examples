package main

import (
	"github.com/pulumi/pulumi-aws/sdk/go/aws"
	"github.com/pulumi/pulumi-aws/sdk/go/aws/ec2"
	"github.com/pulumi/pulumi/sdk/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Create a new security group for port 80.
		group, err := ec2.NewSecurityGroup(ctx, "web-secgrp", &ec2.SecurityGroupArgs{
			Ingress: []map[string]interface{}{
				{
					"protocol":   "tcp",
					"fromPort":   80,
					"toPort":     80,
					"cidrBlocks": []string{"0.0.0.0/0"},
				},
			},
		})
		if err != nil {
			return err
		}

		// Get the ID for the latest Amazon Linux AMI.
		ami, err := aws.LookupAmi(ctx, &aws.GetAmiArgs{
			Filters: []interface{}{
				map[string]interface{}{
					"name":   "name",
					"values": []interface{}{"amzn-ami-hvm-*-x86_64-ebs"},
				},
			},
			Owners:     []interface{}{"137112412989"},
			MostRecent: true,
		})
		if err != nil {
			return err
		}

		// Create a simple web server using the startup script for the instance.
		srv, err := ec2.NewInstance(ctx, "web-server-www", &ec2.InstanceArgs{
			Tags:           map[string]interface{}{"Name": "web-server-www"},
			InstanceType:   "t2.micro", // t2.micro is available in the AWS free tier.
			SecurityGroups: []interface{}{group.Name()},
			Ami:            ami.Id,
			UserData: `#!/bin/bash
echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &`,
		})

		// Export the resulting server's IP address and DNS name.
		ctx.Export("publicIp", srv.PublicIp())
		ctx.Export("publicHostName", srv.PublicDns())
		return nil
	})
}
