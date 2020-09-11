[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

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
        Type                                Name                                          Plan       
        pulumi:pulumi:Stack                 voting-app-aws-ts-k8s-voting-app                         
    -   ├─ pulumi-nodejs:dynamic:Resource   postgresql-votes-schema                       created     
    -   ├─ kubernetes:apps:Deployment       server-side-service                           created     
    -   ├─ postgresql:index:Database           postgresql-database                           created     
    -   pulumi:pulumi:Stack                    voting-app-aws-ts-k8s-voting-app              created     
    -   ├─ pulumi:providers:postgresql         postgresql-provider                           created     
    -   ├─ kubernetes:apps:Deployment          client-side-service                           created     
    -   ├─ kubernetes:core:Service             server-side-listener                          created     
    -   ├─ kubernetes:apps:Deployment          database-side-service                         created     
    -   ├─ kubernetes:core:Service             client-side-listener                          created     
    -   ├─ kubernetes:core:Service             database-side-listener                        created     
    -   ├─ awsx:ecr:Repository                 client-side-service                           created     
    -   │  ├─ aws:ecr:LifecyclePolicy          client-side-service                           created     
    -   │  └─ aws:ecr:Repository               client-side-service                           created     
    -   ├─ awsx:ecr:Repository                 database-side-service                         created     
    -   │  ├─ aws:ecr:LifecyclePolicy          database-side-service                         created     
    -   │  └─ aws:ecr:Repository               database-side-service                         created     
    -   ├─ awsx:ecr:Repository                 server-side-service                           created     
    -   │  ├─ aws:ecr:LifecyclePolicy          server-side-service                           created     
    -   │  └─ aws:ecr:Repository               server-side-service                           created     
    -   ├─ aws:ebs:Volume                      storage-volume                                created     
    -   └─ eks:index:Cluster                   eksCluster                                    created     
    -      ├─ pulumi:providers:kubernetes      eksCluster-provider                           created     
    -      ├─ aws:cloudformation:Stack         eksCluster-nodes                              created     
    -      ├─ aws:ec2:LaunchConfiguration      eksCluster-nodeLaunchConfiguration            created     
    -      ├─ aws:ec2:SecurityGroupRule        eksCluster-eksNodeIngressRule                 created     
    -      ├─ aws:ec2:SecurityGroupRule        eksCluster-eksNodeInternetEgressRule          created     
    -      ├─ aws:ec2:SecurityGroupRule        eksCluster-eksClusterIngressRule              created     
    -      ├─ aws:ec2:SecurityGroupRule        eksCluster-eksNodeClusterIngressRule          created     
    -      ├─ kubernetes:core:ConfigMap        eksCluster-nodeAccess                         created     
    -      ├─ aws:ec2:SecurityGroupRule        eksCluster-eksExtApiServerClusterIngressRule  created     
    -      ├─ aws:ec2:SecurityGroup            eksCluster-nodeSecurityGroup                  created     
    -      ├─ pulumi:providers:kubernetes      eksCluster-eks-k8s                            created     
    -      ├─ pulumi-nodejs:dynamic:Resource   eksCluster-vpc-cni                            created     
    -      ├─ aws:iam:InstanceProfile          eksCluster-instanceProfile                    created     
    -      ├─ aws:eks:Cluster                  eksCluster-eksCluster                         created     
    -      ├─ aws:ec2:SecurityGroupRule        eksCluster-eksClusterInternetEgressRule       created     
    -      ├─ pulumi-nodejs:dynamic:Resource   eksCluster-cfnStackName                       created     
    -      ├─ eks:index:ServiceRole            eksCluster-eksRole                            created     
    -      │  ├─ aws:iam:RolePolicyAttachment  eksCluster-eksRole-90eb1c99                   created     
    -      │  ├─ aws:iam:RolePolicyAttachment  eksCluster-eksRole-4b490823                   created     
    -      │  └─ aws:iam:Role                  eksCluster-eksRole-role                       created     
    -      ├─ aws:ec2:SecurityGroup            eksCluster-eksClusterSecurityGroup            created     
    -      └─ eks:index:ServiceRole            eksCluster-instanceRole                       created     
    -         ├─ aws:iam:RolePolicyAttachment  eksCluster-instanceRole-03516f97              created     
    -         ├─ aws:iam:RolePolicyAttachment  eksCluster-instanceRole-e1b295bd              created     
    -         ├─ aws:iam:RolePolicyAttachment  eksCluster-instanceRole-3eb088f2              created     
    -         └─ aws:iam:Role                  eksCluster-instanceRole-role                  created     
     
    Outputs:
        URL: "a6d06dd637ba84d839b36e22ea4fd2e0-1378265413.us-west-2.elb.amazonaws.com"
        kubeConfig: ...

    Resources:
        + 48 created

    Duration: 18m28s
    ```

1. View the DNS address of the instance via `pulumi stack output`:

    ```bash
    $ pulumi stack output
    Current stack outputs (1):
        OUTPUT   VALUE
        URL  a6d06dd637ba84d839b36e22ea4fd2e0-1378265413.us-west-2.elb.amazonaws.com
    ```

1.  Verify that the ECS instance exists by connecting to it in a browser window.

## Clean up

To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.