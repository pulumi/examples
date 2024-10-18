package main

import (
	"strconv"

	"github.com/divan/num2words"
	"github.com/pulumi/pulumi-aws/sdk/v5/go/aws"
	"github.com/pulumi/pulumi-aws/sdk/v5/go/aws/ec2"
	"github.com/pulumi/pulumi-aws/sdk/v5/go/aws/lb"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// CONFIGURATION FOR THIS PULUMI PROJECT
		// HOW MANY SERVER YOU WANT????
		const srvCount = 3

		// get available zone
		azs, err := aws.GetAvailabilityZones(ctx, &aws.GetAvailabilityZonesArgs{
			State: pulumi.StringRef("available"),
		})
		if err != nil {
			return err
		}
		azCount := len(azs.Names)

		var vpc *ec2.LookupVpcResult
		for {
			// get default vpc
			var err error
			vpc, err = ec2.LookupVpc(ctx, &ec2.LookupVpcArgs{
				Default: pulumi.BoolRef(true),
			})
			if vpc != nil { // if vpc exist break the loop
				break
			}
			// since default vpc is not available, create new default vpc
			_, err = ec2.NewDefaultVpc(ctx, "default-vpc", &ec2.DefaultVpcArgs{
				EnableDnsHostnames: pulumi.Bool(true),
				EnableDnsSupport:   pulumi.Bool(true),
				Tags: pulumi.StringMap{
					"Name": pulumi.String("default-vpc"),
				},
			})
			if err != nil {
				return err
			}
		}
		// vpc, err := ec2.NewVpc(ctx, "web-vpc", &ec2.VpcArgs{
		// 	CidrBlock: pulumi.String("172.0.0.0/16"),
		// })

		// Create a new security group
		// this allow all traffic from the internet for HTTP
		secGroup, err := ec2.NewSecurityGroup(ctx, "web-secgrp", &ec2.SecurityGroupArgs{
			Description: pulumi.String("Enable HTTP access"),
			VpcId:       pulumi.String(vpc.Id),
			Ingress: ec2.SecurityGroupIngressArray{
				ec2.SecurityGroupIngressArgs{
					Description: pulumi.String("Allow HTTP traffic"),
					Protocol:    pulumi.String("tcp"),
					FromPort:    pulumi.Int(80),
					ToPort:      pulumi.Int(80),
					CidrBlocks:  pulumi.StringArray{pulumi.String("0.0.0.0/0")},
				},
			},
			Egress: ec2.SecurityGroupEgressArray{
				ec2.SecurityGroupEgressArgs{
					Description: pulumi.String("Allow all outbound traffic by default"),
					Protocol:    pulumi.String("-1"), // all protocols for outbound traffic
					FromPort:    pulumi.Int(0),
					ToPort:      pulumi.Int(0),
					CidrBlocks:  pulumi.StringArray{pulumi.String("0.0.0.0/0")},
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
					Values: []string{"amzn2*x86_64*"},
				},
				{
					Name:   "root-device-type",
					Values: []string{"ebs"},
				},
				{
					Name:   "virtualization-type",
					Values: []string{"hvm"},
				},
			},
			MostRecent: &mostRecent,
		})
		if err != nil {
			return err
		}

		// Create an EC2 instances using the latest AMI.
		// with script to install httpd, start the service
		// and create static index.html
		// then store the server in an array
		var srv [srvCount]*ec2.Instance
		for i := 0; i < srvCount; i++ {
			name := "web-server-" + strconv.Itoa(i+1)
			word := num2words.Convert(i + 1) // import github.com/divan/num2words
			// var word string
			// if i == 0 {
			// 	word = "first"
			// } else {
			// 	word = "second"
			// }
			srv[i], err = ec2.NewInstance(ctx, name, &ec2.InstanceArgs{
				Tags:                pulumi.StringMap{"Name": pulumi.String(name)}, // web-server-1, web-server-2, web-server-3, ...
				InstanceType:        pulumi.String("t3.micro"),                     // t3.micro is available in the AWS free tier.
				VpcSecurityGroupIds: pulumi.StringArray{secGroup.ID()},
				Ami:                 pulumi.String(ami.Id),
				AvailabilityZone:    pulumi.String(azs.Names[i%azCount]), // share the EC2 instance across the AZs
				UserData: pulumi.String(`#!/bin/bash
			yum update -y
			yum install -y httpd
			systemctl enable httpd
			systemctl start httpd
				echo "<html>
					<head>
						<title>Hello, Pulumi!</title>
					</head>
					<body>
						<h1>Hello, Pulumi!</h1>
						<p>Welcome to my Pulumi - AWS - GOLANG example.</p>
						<p>Static web page on ec2 with load balancer. Refresh the page to see the change.</p>
						<p>Instance: <code>` + word + ` INSTANCE</code></p>
					</body>
				</html>" > /var/www/html/index.html`),
			})
			if err != nil {
				return err
			}
		}

		// Create a load balancer to listen for HTTP traffic on port 80.
		var lbArgs lb.LoadBalancerSubnetMappingArray
		for idx := range srv {
			lbArgs = append(lbArgs, lb.LoadBalancerSubnetMappingArgs{
				SubnetId: srv[idx].SubnetId,
			})
		}

		loadBalancer, err := lb.NewLoadBalancer(ctx, "web-lb", &lb.LoadBalancerArgs{
			LoadBalancerType: pulumi.String("application"),
			SecurityGroups:   pulumi.StringArray{secGroup.ID()},
			Internal:         pulumi.Bool(false),
			SubnetMappings:   lbArgs,
		})
		if err != nil {
			return err
		}
		targetGroup, err := lb.NewTargetGroup(ctx, "web-tdg", &lb.TargetGroupArgs{
			Port:       pulumi.Int(80),
			Protocol:   pulumi.String("HTTP"),
			TargetType: pulumi.String("instance"),
			VpcId:      pulumi.String(vpc.Id),
		})
		if err != nil {
			return err
		}
		var tdgAttachments [srvCount]*lb.TargetGroupAttachment
		for i := 0; i < srvCount; i++ {
			tdgAttachment, err := lb.NewTargetGroupAttachment(ctx, "web-tdg-attachment-"+strconv.Itoa(i), &lb.TargetGroupAttachmentArgs{
				TargetGroupArn: targetGroup.Arn,
				TargetId:       srv[i].ID(),
				Port:           pulumi.Int(80),
			})
			tdgAttachments[i] = tdgAttachment
			if err != nil {
				return err
			}
		}

		lsn, err := lb.NewListener(ctx, "web-lsn", &lb.ListenerArgs{
			LoadBalancerArn: loadBalancer.Arn,
			Port:            pulumi.Int(80),
			Protocol:        pulumi.String("HTTP"),
			DefaultActions: lb.ListenerDefaultActionArray{
				lb.ListenerDefaultActionArgs{
					Type:           pulumi.String("forward"),
					TargetGroupArn: targetGroup.Arn,
				},
			},
		})
		if err != nil {
			return err
		}

		for i := range azs.Names {
			ctx.Export("az"+strconv.Itoa(i+1), pulumi.String(azs.Names[i]))
		}

		for i := range srv {
			ctx.Export("ec2 srv publicIp"+strconv.Itoa(i+1), srv[i].PublicIp)
		}

		for i := range tdgAttachments {
			ctx.Export("tdgAttachment id"+strconv.Itoa(i+1), tdgAttachments[i].ID())
		}

		ctx.Export("loadBalancer DNS", loadBalancer.DnsName)
		ctx.Export("targetGroup arn", targetGroup.Arn)
		ctx.Export("vpcId", pulumi.String(vpc.Id))
		ctx.Export("listener arn", lsn.Arn)
		ctx.Export("securityGroup id", secGroup.ID())

		return nil
	})
}
