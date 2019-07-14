import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";

//* STEP 1: Create an EKS Cluster

const vpc = new awsx.Network("vpc-alb-ingress-eks", { usePrivateSubnets: false });
const cluster = new eks.Cluster("eks-cluster", {
  vpcId             : vpc.vpcId,
  subnetIds         : vpc.publicSubnetIds,
  instanceType      : "t2.medium",
  version           : "1.12",
  nodeRootVolumeSize: 200,
  desiredCapacity   : 3,
  maxSize           : 4,
  minSize           : 3,
  deployDashboard   : false,
  vpcCniOptions     : {
    warmIpTarget    : 4,
  },
});

export const clusterName = cluster.eksCluster.name;
export const clusterNodeInstanceRoleName = cluster.instanceRoles.apply(roles => roles[0].name);
export const kubeconfig = cluster.kubeconfig;
export const nodesubnetId = cluster.core.subnetIds;

//Tag AWS subnets to allow ingress controller to auto discover subnets used for ALBs.
//kubernetes.io/cluster/${cluster-name} must be set to owned or shared.
//kubernetes.io/role/elb must be set to 1 or `` for internet-facing LoadBalancers

//* STEP 2: Declare ALB Ingress Controller from a Helm Chart

//Create IAM Policy for the IngressController called "ingressController-iam-policy” and read the policy ARN
const ingressControllerPolicy = new aws.iam.Policy("ingressController-iam-policy", {
    policy: {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": [
              "acm:DescribeCertificate",
              "acm:ListCertificates",
              "acm:GetCertificate"
            ],
            "Resource": "*"
          },
          {
            "Effect": "Allow",
            "Action": [
              "ec2:AuthorizeSecurityGroupIngress",
              "ec2:CreateSecurityGroup",
              "ec2:CreateTags",
              "ec2:DeleteTags",
              "ec2:DeleteSecurityGroup",
              "ec2:DescribeInstances",
              "ec2:DescribeInstanceStatus",
              "ec2:DescribeSecurityGroups",
              "ec2:DescribeSubnets",
              "ec2:DescribeTags",
              "ec2:DescribeVpcs",
              "ec2:ModifyInstanceAttribute",
              "ec2:ModifyNetworkInterfaceAttribute",
              "ec2:RevokeSecurityGroupIngress"
            ],
            "Resource": "*"
          },
          {
            "Effect": "Allow",
            "Action": [
              "elasticloadbalancing:AddTags",
              "elasticloadbalancing:CreateListener",
              "elasticloadbalancing:CreateLoadBalancer",
              "elasticloadbalancing:CreateRule",
              "elasticloadbalancing:CreateTargetGroup",
              "elasticloadbalancing:DeleteListener",
              "elasticloadbalancing:DeleteLoadBalancer",
              "elasticloadbalancing:DeleteRule",
              "elasticloadbalancing:DeleteTargetGroup",
              "elasticloadbalancing:DeregisterTargets",
              "elasticloadbalancing:DescribeListeners",
              "elasticloadbalancing:DescribeLoadBalancers",
              "elasticloadbalancing:DescribeLoadBalancerAttributes",
              "elasticloadbalancing:DescribeRules",
              "elasticloadbalancing:DescribeSSLPolicies",
              "elasticloadbalancing:DescribeTags",
              "elasticloadbalancing:DescribeTargetGroups",
              "elasticloadbalancing:DescribeTargetGroupAttributes",
              "elasticloadbalancing:DescribeTargetHealth",
              "elasticloadbalancing:ModifyListener",
              "elasticloadbalancing:ModifyLoadBalancerAttributes",
              "elasticloadbalancing:ModifyRule",
              "elasticloadbalancing:ModifyTargetGroup",
              "elasticloadbalancing:ModifyTargetGroupAttributes",
              "elasticloadbalancing:RegisterTargets",
              "elasticloadbalancing:RemoveTags",
              "elasticloadbalancing:SetIpAddressType",
              "elasticloadbalancing:SetSecurityGroups",
              "elasticloadbalancing:SetSubnets",
              "elasticloadbalancing:SetWebACL"
            ],
            "Resource": "*"
          },
          {
            "Effect": "Allow",
            "Action": [
              "iam:GetServerCertificate",
              "iam:ListServerCertificates"
            ],
            "Resource": "*"
          },
          {
            "Effect": "Allow",
            "Action": [
              "waf-regional:GetWebACLForResource",
              "waf-regional:GetWebACL",
              "waf-regional:AssociateWebACL",
              "waf-regional:DisassociateWebACL"
            ],
            "Resource": "*"
          },
          {
            "Effect": "Allow",
            "Action": [
              "tag:GetResources",
              "tag:TagResources"
            ],
            "Resource": "*"
          },
          {
            "Effect": "Allow",
            "Action": [
              "waf:GetWebACL"
            ],
            "Resource": "*"
          }
        ]}
}); 

//Attach this policy to the NodeInstanceRole of the worker nodes
export const nodeinstanceRole = new aws.iam.RolePolicyAttachment("eks-NodeInstanceRole-policy-attach", {
    policyArn: ingressControllerPolicy.arn,
    role: clusterNodeInstanceRoleName,
});


//Declare the ALBIngressController in 1 step with the Helm Chart
const albingresscntlr = new k8s.helm.v2.Chart("alb", {
    chart: "http://storage.googleapis.com/kubernetes-charts-incubator/aws-alb-ingress-controller-0.1.9.tgz",
    values: {
        clusterName: clusterName,
        autoDiscoverAwsRegion: "true",
        autoDiscoverAwsVpcID: "true",
    },
}, { provider: cluster.provider });

//* STEP 3: Deploy Sample Application

function createNewNamespace(name: string): k8s.core.v1.Namespace {
    //Create new namespace
    return new k8s.core.v1.Namespace(name, { metadata: { name: name } }, { provider: cluster.provider });
  }

//declare 2048 namespace, deployment and service
const nsgame = createNewNamespace("2048-game");

const deploymentgame = new k8s.extensions.v1beta1.Deployment("deployment-game", {
    metadata: { name: "deployment-game", namespace: "2048-game" },
    spec: {
        replicas: 5,
        template: { 
            metadata: { labels: { app: "2048" } },
            spec: { containers: [{ 
                        image: "alexwhen/docker-2048", 
                        imagePullPolicy: "Always", 
                        name: "2048", 
                        ports: [{ containerPort: 80 }] 
                    }],
            },
        },
    },
}, { provider: cluster.provider });

const servicegame = new k8s.core.v1.Service("service-game", {
    metadata: { name: "service-2048", namespace: "2048-game" },
    spec: {
        ports: [{ port: 80, targetPort: 80, protocol: "TCP" }],
        type: "NodePort",
        selector: { app: "2048" },
    },
}, { provider: cluster.provider });

//declare 2048 ingress
export const ingressgame = new k8s.extensions.v1beta1.Ingress("ingress-game", {
    metadata: { 
        name: "2048-ingress", 
        namespace: "2048-game",
        annotations: { 
            "kubernetes.io/ingress.class": "alb", 
            "alb.ingress.kubernetes.io/scheme": "internet-facing",
        },
        labels: { app: "2048-ingress" },
    },
    spec: {
        rules: [{ 
            http: { 
                paths: [{ path: "/*", backend: { serviceName: "service-2048", servicePort: 80 } }] 
            }
        }],
    },
}, { provider: cluster.provider });
