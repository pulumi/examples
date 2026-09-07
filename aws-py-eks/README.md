[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-eks/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-eks/README.md#gh-dark-mode-only)

# Amazon EKS cluster

This example deploys an EKS Kubernetes cluster inside an AWS VPC with proper NodeGroup and networking configured.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)
4. *Optional for K8s auth:* [Install `iam-authenticator`](https://docs.aws.amazon.com/eks/latest/userguide/install-aws-iam-authenticator.html)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init python-eks-testing
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-east-2
    ```

1.  Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```bash
    pulumi up
    ```

    ```
    Previewing stack 'python-eks-testing'
    Previewing changes:
    ...

    Do you want to perform this update? yes
    Updating (python-eks-testing):

        Type                              Name                                Status
    +   pulumi:pulumi:Stack               aws-py-eks-python-eks-testing       created
    +   ├─ aws:iam:Role                   ec2-nodegroup-iam-role              created
    +   ├─ aws:iam:Role                   eks-iam-role                        created
    +   ├─ aws:ec2:Vpc                    eks-vpc                             created
    +   ├─ aws:iam:RolePolicyAttachment   eks-workernode-policy-attachment    created
    +   ├─ aws:iam:RolePolicyAttachment   eks-cni-policy-attachment           created
    +   ├─ aws:iam:RolePolicyAttachment   ec2-container-ro-policy-attachment  created
    +   ├─ aws:iam:RolePolicyAttachment   eks-service-policy-attachment       created
    +   ├─ aws:iam:RolePolicyAttachment   eks-cluster-policy-attachment       created
    +   ├─ aws:ec2:InternetGateway        vpc-ig                              created
    +   ├─ aws:ec2:Subnet                 vpc-sn-1                            created
    +   ├─ aws:ec2:Subnet                 vpc-sn-2                            created
    +   ├─ aws:ec2:SecurityGroup          eks-cluster-sg                      created
    +   ├─ aws:ec2:RouteTable             vpc-route-table                     created
    +   ├─ aws:eks:Cluster                eks-cluster                         created
    +   ├─ aws:ec2:RouteTableAssociation  vpc-1-route-table-assoc             created
    +   ├─ aws:ec2:RouteTableAssociation  vpc-2-route-table-assoc             created
    +   └─ aws:eks:NodeGroup              eks-node-group                      created

    Outputs:
        cluster-name: "eks-cluster-96b87e8"

    Resources:
        + 18 created

    Duration: 14m15s
    ```

1.  View the cluster name via `pulumi stack output`:

    ```bash
    pulumi stack output
    ```

    ```
    Current stack outputs (1):
    OUTPUT                   VALUE
    cluster-name  eks-cluster-96b87e8
    ```

1.  Verify that the EKS cluster exists, by either using the AWS Console or running `aws eks list-clusters`.

1.  Update your kubeconfig, authenticate to your Kubernetes cluster, and verify you have API access and nodes running:

    ```bash
    aws eks --region us-east-2 update-kubeconfig --name $(pulumi stack output cluster-name)
    ```

    ```
    Added new context arn:aws:eks:us-east-2:account:cluster/eks-cluster-96b87e8
    ```

    ```bash
    kubectl get nodes
    ```

    ```
    NAME                                         STATUS   ROLES    AGE   VERSION
    ip-10-100-0-182.us-east-2.compute.internal   Ready    <none>   10m   v1.14.7-eks-1861c5
    ip-10-100-1-174.us-east-2.compute.internal   Ready    <none>   10m   v1.14.7-eks-1861c5
    ```

## Cleaning up

To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt. Then run `pulumi stack rm` to remove the stack.
