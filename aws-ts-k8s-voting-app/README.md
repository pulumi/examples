[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-k8s-voting-app/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-k8s-voting-app/README.md#gh-dark-mode-only)

# Kubernetes Voting App

A simple voting app that uses Kubernetes.

The example shows how easy it is to deploy a containerized application to Amazon EKS. Pulumi does the following:
- Builds the Docker images
- Provisions AWS Container Registry (ECR) instance
- Pushes the images to the ECR instance
- Provisions AWS EKS cluster
- Uses the images to create Kubernetes deployments

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Configure Pulumi for Python](https://www.pulumi.com/docs/intro/languages/python/)
1. [Install Docker](https://docs.docker.com/engine/installation/)

## Deploying and running the program


1. Create a new stack:

    ```bash
    $ pulumi stack init aws-ts-k8s-voting-app
    ```

1. Set the AWS region and the usernames and passwords for a set of accounts the project uses:

    ```bash
    $ pulumi config set aws:region us-west-2
    $ pulumi config set sqlAdminName <NAME>
    $ pulumi config set sqlsqlAdminPassword <PASSWORD> --secret
    $ pulumi config set sqlUserName <NAME>
    $ pulumi config set sqlUserPassword <PASSWORD> --secret
    ```

1. Restore NPM modules via `npm install` or `yarn install`.

1. Run `pulumi up -y` to deploy changes:
    ```bash
    Updating (aws-ts-k8s-voting-app):
        Type                                   Name                                          Status
    +   pulumi:pulumi:Stack                    voting-app-aws-ts-k8s-voting-app              created
    +   ├─ awsx:ecr:Repository                 server-side-service                           created
    +   │  ├─ aws:ecr:Repository               server-side-service                           created
    +   │  └─ aws:ecr:LifecyclePolicy          server-side-service                           created
    +   ├─ awsx:ecr:Repository                 client-side-service                           created
    +   │  ├─ aws:ecr:Repository               client-side-service                           created
    +   │  └─ aws:ecr:LifecyclePolicy          client-side-service                           created
    +   ├─ eks:index:Cluster                   eksCluster                                    created
    +   │  ├─ eks:index:ServiceRole            eksCluster-eksRole                            created
    +   │  │  ├─ aws:iam:Role                  eksCluster-eksRole-role                       created
    +   │  │  ├─ aws:iam:RolePolicyAttachment  eksCluster-eksRole-4b490823                   created
    +   │  │  └─ aws:iam:RolePolicyAttachment  eksCluster-eksRole-90eb1c99                   created
    +   │  ├─ eks:index:ServiceRole            eksCluster-instanceRole                       created
    +   │  │  ├─ aws:iam:Role                  eksCluster-instanceRole-role                  created
    +   │  │  ├─ aws:iam:RolePolicyAttachment  eksCluster-instanceRole-e1b295bd              created
    +   │  │  ├─ aws:iam:RolePolicyAttachment  eksCluster-instanceRole-3eb088f2              created
    +   │  │  └─ aws:iam:RolePolicyAttachment  eksCluster-instanceRole-03516f97              created
    +   │  ├─ pulumi-nodejs:dynamic:Resource   eksCluster-cfnStackName                       created
    +   │  ├─ aws:ec2:SecurityGroup            eksCluster-eksClusterSecurityGroup            created
    +   │  ├─ aws:ec2:SecurityGroupRule        eksCluster-eksClusterInternetEgressRule       created
    +   │  ├─ aws:eks:Cluster                  eksCluster-eksCluster                         created
    +   │  ├─ aws:iam:InstanceProfile          eksCluster-instanceProfile                    created
    +   │  ├─ aws:ec2:SecurityGroup            eksCluster-nodeSecurityGroup                  created
    +   │  ├─ aws:ec2:SecurityGroupRule        eksCluster-eksNodeClusterIngressRule          created
    +   │  ├─ aws:ec2:SecurityGroupRule        eksCluster-eksNodeIngressRule                 created
    +   │  ├─ aws:ec2:SecurityGroupRule        eksCluster-eksNodeInternetEgressRule          created
    +   │  ├─ aws:ec2:SecurityGroupRule        eksCluster-eksClusterIngressRule              created
    +   │  ├─ aws:ec2:SecurityGroupRule        eksCluster-eksExtApiServerClusterIngressRule  created
    +   │  ├─ aws:ec2:LaunchConfiguration      eksCluster-nodeLaunchConfiguration            created
    +   │  ├─ pulumi:providers:kubernetes      eksCluster-eks-k8s                            created
    +   │  ├─ pulumi-nodejs:dynamic:Resource   eksCluster-vpc-cni                            created
    +   │  ├─ kubernetes:core:ConfigMap        eksCluster-nodeAccess                         created
    +   │  ├─ aws:cloudformation:Stack         eksCluster-nodes                              created
    +   │  └─ pulumi:providers:kubernetes      eksCluster-provider                           created
    +   ├─ awsx:ecr:Repository                 database-side-service                         created
    +   │  ├─ aws:ecr:Repository               database-side-service                         created
    +   │  └─ aws:ecr:LifecyclePolicy          database-side-service                         created
    +   ├─ aws:ebs:Volume                      storage-volume                                created
    +   ├─ kubernetes:apps:Deployment          database-side-service                         created
    +   ├─ kubernetes:core:Service             database-side-listener                        created
    +   ├─ kubernetes:apps:Deployment          server-side-service                           created
    +   ├─ kubernetes:core:Service             server-side-listener                          created
    +   ├─ kubernetes:apps:Deployment          client-side-service                           created
    +   └─ kubernetes:core:Service             client-side-listener                          created

    Outputs:
        URL       : "ab368f798ca564be295df514dfbc7a0e-519435073.us-west-2.elb.amazonaws.com"
        kubeConfig: {...}

    Resources:
        + 44 created

    Duration: 15m45s
    ```

1.  Verify that the ECS instance exists by connecting to it on port 3000 in a browser window.

## Clean up

To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
