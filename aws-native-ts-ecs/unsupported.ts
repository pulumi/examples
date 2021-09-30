import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const defaultVpc = pulumi.output(aws.ec2.getVpc({ default: true }));
const defaultVpcSubnets = defaultVpc.id.apply(id => aws.ec2.getSubnetIds({vpcId: id}));

const group = new aws.ec2.SecurityGroup("web-secgrp", {
	vpcId: defaultVpc.id,
	description: "Enable HTTP access",
	ingress: [{
		protocol: "tcp",
		fromPort: 80,
		toPort: 80,
		cidrBlocks: ["0.0.0.0/0"],
    }],
  	egress: [{
		protocol:"-1",
		fromPort: 0,
		toPort: 0,
		cidrBlocks: ["0.0.0.0/0"],
    }],
});

const alb = new aws.lb.LoadBalancer("app-lb", {
	securityGroups: [group.id],
	subnets: defaultVpcSubnets.ids,
});

const atg = new aws.lb.TargetGroup("app-tg", {
    port: 80,
	protocol: "HTTP",
	targetType: "ip",
	vpcId: defaultVpc.id,
});

const role = new aws.iam.Role("task-exec-role", {
	assumeRolePolicy: {
		Version: "2008-10-17",
		Statement: [{
			Sid: "",
			Effect: "Allow",
			Principal: {
				Service: "ecs-tasks.amazonaws.com"
			},
			Action: "sts:AssumeRole",
		}],
	},
});

const rpa = new aws.iam.RolePolicyAttachment("task-exec-policy", {
	role: role.name,
	policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
});

export const albArn = alb.arn;
export const albDnsName = alb.dnsName;
export const atgArn = atg.arn;
export const roleArn = role.arn;
export const subnetIds = defaultVpcSubnets.ids;
export const securityGroupId = group.id;
