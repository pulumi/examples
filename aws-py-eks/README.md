[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-eks/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-eks/README.md#gh-dark-mode-only)

# Amazon EKS Cluster

This example deploys an EKS Kubernetes cluster inside a AWS VPC with proper NodeGroup and Networking Configured

## Deploying the App

To deploy your infrastructure, follow the below steps.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Configure Pulumi for Python](https://www.pulumi.com/docs/intro/languages/python/)
1. *Optional for K8 Auth* [Install `iam-authenticator`](https://docs.aws.amazon.com/eks/latest/userguide/install-aws-iam-authenticator.html)

## Deploying and running the program

1.  Create a new stack:

    ```
    $ pulumi stack init python-eks-testing
    ```

1.  Set the AWS region:

    ```
    $ pulumi config set aws:region us-east-2
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
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

1.  View the cluster name via `stack output`:

    ```
    $ pulumi stack output
        Current stack outputs (1):
        OUTPUT                   VALUE
        cluster-name  eks-cluster-96b87e8
    ```

1.  Verify that the EKS cluster exists, by either using the AWS Console or running `aws eks list-clusters`.

1. Update your KubeConfig, Authenticate to your Kubernetes Cluster and verify you have API access and nodes running.

```
$ aws eks --region us-east-2 update-kubeconfig --name $(pulumi stack output cluster-name)

    Added new context arn:aws:eks:us-east-2:account:cluster/eks-cluster-96b87e8
```


```
$ kubectl get nodes

    NAME                                         STATUS   ROLES    AGE   VERSION
    ip-10-100-0-182.us-east-2.compute.internal   Ready    <none>   10m   v1.14.7-eks-1861c5
    ip-10-100-1-174.us-east-2.compute.internal   Ready    <none>   10m   v1.14.7-eks-1861c5
```

## Clean up

To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
