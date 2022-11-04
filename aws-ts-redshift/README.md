# Launch an Amazon Redshift cluster into a VPC

This example shows how to launch a single-node [Amazon Redshift](https://aws.amazon.com/redshift/) cluster into a [VPC](https://aws.amazon.com/vpc/) with Pulumi.

[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/tree/master/aws-ts-redshift)

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/).
1. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/).
1. Configure your [AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/).

### Deploying the stack

1. Clone this repo, change to this directory, then create a new [stack](https://www.pulumi.com/docs/intro/concepts/stack/) for the project:

    ```bash
    pulumi stack init
    ```

2. Apply the required configuration properties, making sure to choose a strong password for the database user. (The password will be stored as an encrypted [Pulumi secret](https://www.pulumi.com/docs/intro/concepts/config/.)

    ```bash
    pulumi config set aws:region us-east-1
    pulumi config set availabilityZone us-east-1a
    pulumi config set clusterIdentifier my-uniquely-named-redshift-cluster
    pulumi config set dbName dev
    pulumi config set dbUsername admin
    pulumi config set dbPassword <YOUR_PASSWORD> --secret
    pulumi config set nodeType dc2.large
    ```

3. With your configuration values applied, deploy the stack to launch the cluster:

    ```bash
    pulumi up
    ```

4. In a few minutes, the cluster will be up and running and the endpoint emitted as a Pulumi [stack output](https://www.pulumi.com/docs/intro/concepts/stack/#outputs):

    ```bash
    ...
    Outputs:
        endpoint: "my-redshift-cluster.ctus17b2oy8s.us-east-1.redshift.amazonaws.com:5439"
    ```

5. When you're ready, destroy your stack and remove it:

    ```bash
    pulumi destroy --yes
    pulumi stack rm --yes
    ```
