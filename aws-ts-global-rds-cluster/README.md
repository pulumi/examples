[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Multi-Region AWS Global RDS Cluster

This example will deploy a multi-region AWS Global RDS Cluster. As of the time of writing, there are some [limits](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html#aurora-global-database.limitations)
to RDS Global Clusters. 

# Prerequisites

- [Node.js](https://nodejs.org/en/download/)
- [Download and install the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- [Connect Pulumi with your AWS account](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/) (if your AWS CLI is
      configured, this will just work)

# Running the Example

After cloning this repo, `cd` into it and run these commands:

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init dev
    ```

1. Set your desired AWS region:

    ```bash
    $ pulumi config set aws:region us-west-2
    ```
   
1. Set the region of the secondary member of the global RDS Cluster

    ```bash
    $ pulumi config set secondaryRegion us-east-1
    ```

1. Deploy everything with a single `pulumi up` command. This will show you a preview of changes first, which
   includes all of the required AWS resources (clusters, services, and the like). Don't worry if it's more than
   you expected -- this is one of the benefits of Pulumi, it configures everything so that so you don't need to!

    ```bash
    $ pulumi up
    ```

    After being prompted and selecting "yes", your deployment will begin. It'll complete in a few minutes:

    ```
    Updating (dev):

      Type                        Name                           Status      Info
  +   pulumi:pulumi:Stack         aws-ts-global-rds-cluster-dev  created      1 warning
  +   ├─ pulumi:providers:aws     us-east-1-provider             created
  +   ├─ aws:rds:GlobalCluster    global-cluster                 created
  +   ├─ aws:rds:ClusterInstance  primary-cluster-instance       created
  +   ├─ aws:rds:Cluster          primary-cluster                created
  +   ├─ aws:rds:Cluster          us-east-1-cluster              created
  +   └─ aws:rds:ClusterInstance  us-east-1-cluster-instance     created

    Outputs:
        primary            : "tf-20191007203155585900000002.cep6renxwgtk.us-west-2.rds.amazonaws.com"
        secondary-us-east-1: "tf-20191007211638748500000002.c0q7bvueknic.us-east-1.rds.amazonaws.com"

    Resources:
        + 7 created

    Duration: 34m30s

    Permalink: https://app.pulumi.com/acmecorp/aws-ts-global-rds-cluster/dev/updates/1
    ```

1. At this point, your cluster is running!

1. Once you are done, you can destroy all of the resources, and the stack:

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```
