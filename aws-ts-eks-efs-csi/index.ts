import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as awsnative from "@pulumi/aws-native";
import * as k8s from "@pulumi/kubernetes";

let conf = new pulumi.Config();
let vpcid = conf.require("vpcid");
let nam = conf.require("nam");

// Need to loop over the AZs to get subnet ids in an array.

let pubsub: any[] = [];
let privsub: any[] = [];
let AZ: string[] = ['a', 'b', 'c'];

for( var az of AZ){
	const publ = pulumi.output(aws.ec2.getSubnet({
		filters: [{
			name: "tag-key",
			values: ["Public"],
		},{
			name: "vpc-id",
			values: [ vpcid ],
		},{
			name: "availability-zone",
			values: [`us-east-2${az}`],
		}],
	}));
	pubsub.push(publ.id)
	const priv = pulumi.output(aws.ec2.getSubnet({
		filters: [{
			name: "tag-key",
			values: ["Private"],
		},{
			name: "vpc-id",
			values: [ vpcid ],
		},{
			name: "availability-zone",
			values: [`us-east-2${az}`],
		}],
	}));
	privsub.push(priv.id)
}
// Lookup sg for AdminVM
const adminsg = pulumi.output(aws.ec2.getSecurityGroups({
	tags: {
		Job: "admin",
	},
}));
// Create a security group for the ENIs which allows communication between the nodes and the control plane
const sg = new aws.ec2.SecurityGroup("EKS", {
	description: "Group for the EKS cluster.",
	vpcId: vpcid,
	ingress: [
		{
			description: "ssh in from the AdminVM",
			fromPort: 22,
			toPort: 22,
			protocol: "tcp",
			securityGroups: [ adminsg.ids[0] ],
		},
		{
			description: "https in from the AdminVM",
			fromPort: 443,
			toPort: 443,
			protocol: "tcp",
			securityGroups: [ adminsg.ids[0] ],
		},

	],
	egress: [
		{
			description: "allow https out to anywhere",
			fromPort: 443,
			toPort: 443,
			protocol: "tcp",
			cidrBlocks: [ "0.0.0.0/0" ],
			ipv6CidrBlocks: ["::/0"],
		},
	],
	tags: {
		name: `${nam}-EKS`,
	},
});
// look up sg used by endpoints
const endp = pulumi.output(aws.ec2.getSecurityGroups({
	tags: {
		Job: "Endpoints",
	},
	filters: [
		{
			name: "vpc-id",
			values: [vpcid],
		},
	],
}));
// lookup the AdminVM Role so we can add it as Admin on the cluster
const adminVMrole = pulumi.output(aws.iam.getRole({
	name: "AdminVM",
}));
// create endpoints for sts, elasticloadbalancing and autoscaling
let endpoints: string[] = ["sts", "elasticloadbalancing", "autoscaling"];
for(var endpoint of endpoints) {
	const endpoi = new aws.ec2.VpcEndpoint(`${nam}-endp-${endpoint}`, {
		vpcId: vpcid,
		serviceName: `com.amazonaws.us-east-2.${endpoint}`,
		vpcEndpointType: "Interface",
		securityGroupIds: [
			endp.ids[0],
		],
		subnetIds: [
			privsub[0],
			privsub[1],
			privsub[2],
		],
		tags: {
			Name: `${nam}-endp-${endpoint}`,
		},
	})
};
// create a Role to run the cluster with.
const serviceRole = new aws.iam.Role(`${nam}-serviceRole`, {
	assumeRolePolicy: JSON.stringify({
		Version: "2012-10-17",
		Statement: [{
			Action: "sts:AssumeRole",
			Effect: "Allow",
			Principal: {
				AWS: "arn:aws:iam::910256582887:role/AdminVM",
			},
		},{
			Action: "sts:AssumeRole",
			Effect: "Allow",
			Principal: {
				Service: "eks.amazonaws.com"
			},
		}],

	}),
	managedPolicyArns: [
		"arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
		"arn:aws:iam::aws:policy/AmazonEKSServicePolicy",
	],
});
// Create an EKS cluster
const cluster = new eks.Cluster(nam, {
	vpcId: vpcid,
	privateSubnetIds: [ privsub[0], privsub[1], privsub[2] ],
	publicSubnetIds: [ pubsub[0], pubsub[1], pubsub[2] ],
	clusterSecurityGroup: sg,
	endpointPrivateAccess: true,
	endpointPublicAccess: false,
	nodeAssociatePublicIpAddress: false,
	instanceType: "t3a.medium",
	maxSize: 10,
	minSize: 2,
	serviceRole: serviceRole,
	createOidcProvider: true,
	roleMappings: [
		{
			groups: [ "system:masters" ],
			roleArn: adminVMrole.arn,
			username: "admin",
		},
	],
});
// and make a clusterrole to give the AdminVM role permissons to admin it. 
const adminVM = new k8s.rbac.v1.ClusterRole("AdminVM", {
	metadata: {
		name: "AdminVM",
	},
	rules: [
		{
			verbs: ["*"],
			resources: ["*"],
			apiGroups: ["*"],
		},
	],
}, { provider:  cluster.provider });
// and add a ClusterRoleBinding to tie it in to the cluster 
const adminVMRB = new k8s.rbac.v1.ClusterRoleBinding("AdminVMRB", {
	metadata: {
		name: "cluster-admin-binding",
	},
	roleRef: {
		apiGroup: "rbac.authorization.k8s.io",
		kind: "ClusterRole",
		name: "AdminVM",
	},
	subjects: [{
			kind: "User",
			name: "admin",
	}],
}, { provider:  cluster.provider });
// Need to be able to access the https ports from the node sg and cluster sg
const nodeHttps = new aws.ec2.SecurityGroupRule("nodeHttps", {
	type: "ingress",
	fromPort: 443,
	toPort: 443,
	protocol: "tcp",
	securityGroupId: endp.ids[0],
	sourceSecurityGroupId: sg.id,
	description: `Allow the ${nam} k8s cluster access to the https in the endpoints sg`,
});
const clusterHttps = new aws.ec2.SecurityGroupRule("clusterHttps", {
	type: "ingress",
	fromPort: 443,
	toPort: 443,
	protocol: "tcp",
	securityGroupId: endp.ids[0],
	sourceSecurityGroupId: cluster.nodeSecurityGroup.id,
	description: `Allow the ${nam} k8s cluster nodes access to https in the endpoints sg`,
});
// Need to be able to access the EFS (NFS) ports from the node sg and cluster sg
const nodeEFS = new aws.ec2.SecurityGroupRule("nodeEFS", {
	type: "ingress",
	fromPort: 2049,
	toPort: 2049,
	protocol: "tcp",
	securityGroupId: endp.ids[0],
	sourceSecurityGroupId: sg.id,
	description: `Allow the ${nam} k8s cluster access to the EFS drive in the endpoints sg`,
});
const clusterEFS = new aws.ec2.SecurityGroupRule("clusterEFS", {
	type: "ingress",
	fromPort: 2049,
	toPort: 2049,
	protocol: "tcp",
	securityGroupId: endp.ids[0],
	sourceSecurityGroupId: cluster.nodeSecurityGroup.id,
	description: `Allow the ${nam} k8s cluster nodes access to the EFS drive in the endpoints sg`,
});
// need to be able to create and destroy EFS drives from the role the nodes run as
const efsPolicy = new aws.iam.Policy("efsPolicy", {
	description: "Policy to allow EFS access for EKS PVC",
	policy: `{
		"Version": "2012-10-17",
		"Statement": [
			{
				"Action": [
					"elasticfilesystem:DescribeAccessPoints",
					"elasticfilesystem:DescribeFileSystems"
				],
				"Effect": "Allow",
				"Resource": "*"
			},
			{
				"Effect": "Allow",
				"Action": "elasticfilesystem:CreateAccessPoint",
				"Resource": "*"
			},
			{
				"Effect": "Allow",
				"Action": "elasticfilesystem:DeleteAccessPoint",
				"Resource": "*"
			}
		]
	}
	`,
});
const oidcUrl = cluster.core.oidcProvider?.url;
const oidcArn = cluster.core.oidcProvider?.arn;

const saAssumeRolePolicy = pulumi
    .all([oidcUrl, oidcArn])
    .apply(([url, arn]) =>
        aws.iam.getPolicyDocument({
            statements: [
                {
                    actions: ['sts:AssumeRoleWithWebIdentity'],
                    conditions: [
                        {
                            test: 'StringEquals',
                            values: [`system:serviceaccount:kube-system:efs-csi-controller-sa`],
                            variable: `${url.replace('https://', '')}:sub`,
                        },
                        {
                            test: 'StringEquals',
                            values: [`sts.amazonaws.com`],
                            variable: `${url.replace('https://', '')}:aud`,
                        },
                    ],
                    effect: 'Allow',
                    principals: [{identifiers: [arn], type: 'Federated'}],
                },
            ],
        })
    );
// Creare a manaagedPolicy to give access to sts:AssumeRoleWithWebIdentity
const webIdentityPolicy = new aws.iam.Policy(`${nam}-WebIdentityPolicy`, {policy: JSON.stringify({
	Version: "2012-10-17",
	Statement: [{
		Action: ["sts:AssumeRoleWithWebIdentity"],
		//should probably limit this to Test roles 
		Resource: "*",
		Effect: "Allow",
	}],
})});
const efsRole = new aws.iam.Role(`${nam}-efsRole`, {
	assumeRolePolicy: saAssumeRolePolicy.json,
	managedPolicyArns: [
		efsPolicy.arn,
		webIdentityPolicy.arn,
	],
}, { dependsOn: [cluster]});
// Now we use the helm chart to deploy the k8s things.
const efscsi = new k8s.helm.v3.Release("efscsi", {
	repositoryOpts: {
		repo: "https://kubernetes-sigs.github.io/aws-efs-csi-driver",
	},
	chart: "aws-efs-csi-driver",
	namespace: "kube-system",
	values: {
		tags: {
			environment: `${nam}`,
		},
		controller: {
			serviceAccount: {
				annotations: {
					"eks.amazonaws.com/role-arn": efsRole.arn,
				},
			},
		},
		node: {
			dnsPolicy: "None",
			dnsConfig: {
				nameservers: [ "169.254.169.253" ],
			},
			serviceAccount: {
				annotations: {
					"eks.amazonaws.com/role-arn": efsRole.arn,
				},
			},
		},
	},
}, { provider: cluster.provider });
export const kubeconfig = cluster.kubeconfig;
