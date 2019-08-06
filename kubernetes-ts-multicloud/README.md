[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Kubernetes Multi-cloud Example

This example creates managed Kubernetes clusters using AKS, EKS, and GKE, and deploys an application
on each cluster.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/reference/install/)
2. [Install Node.js 8.11.3](https://nodejs.org/en/download/)
3. (Optional) [Configure AWS Credentials](https://www.pulumi.com/docs/reference/clouds/aws/setup/)
4. (Optional) [Configure Azure Credentials](https://www.pulumi.com/docs/reference/clouds/azure/setup/)
5. (Optional) [Configure GCP Credentials](https://www.pulumi.com/docs/reference/clouds/gcp/setup/)
6. (Optional) [Configure local access to a Kubernetes cluster](https://kubernetes.io/docs/setup/)

### Steps

After cloning this repo, from this working directory, run these commands:

1. Install the required Node.js packages:

    ```bash
    $ npm install
    ```

2. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```

3. Set the required configuration variables for this program:

    ```bash
    $ pulumi config set aws:region us-west-2
    $ pulumi config set azure:location westus2
    ```
   
   Note that you can choose different regions here.

   We recommend using `us-west-2` to host your EKS cluster as other regions (notably `us-east-1`) may have capacity
   issues that prevent EKS clusters from creating:

    ```
    Diagnostics:
      aws:eks:Cluster: eksCluster
        error: Plan apply failed: creating urn:pulumi:aws-ts-eks-example::aws-ts-eks::EKSCluster$aws:eks/cluster:Cluster::eksCluster: error creating EKS Cluster (eksCluster-233c968): UnsupportedAvailabilityZoneException: Cannot create cluster 'eksCluster-233c968' because us-east-1a, the targeted availability zone, does not currently have sufficient capacity to support the cluster. Retry and choose from these availability zones: us-east-1b, us-east-1c, us-east-1d
            status code: 400, request id: 9f031e89-a0b0-11e8-96f8-534c1d26a353
    ```

    We are tracking enabling the creation of VPCs limited to specific AZs to unblock this in `us-east-1`: pulumi/pulumi-awsx#32

4. (Optional) Choose which clusters to deploy, and uncomment the corresponding lines in the `index.ts` file. None of the
   clusters are enabled by default.

5. Bring up the stack, which will create the selected managed Kubernetes clusters, and deploy an application to each of
   them.

    ```bash
    $ pulumi up
    ```
   
   Here's what it should look like once it completes:
   ![appUrls](images/appUrls.png)

6. You can connect to the example app (kuard) on each cluster using the exported URLs.
   ![kuard](images/kuard.png)

   Important: This application is exposed publicly over http, and can be used to view sensitive details about the
   node. Do not run this application on production clusters!

7. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
