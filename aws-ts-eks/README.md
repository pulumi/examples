[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-eks/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-eks/README.md#gh-dark-mode-only)

# Amazon EKS Cluster

This example deploys an EKS Kubernetes cluster with an EBS-backed StorageClass and deploys the Kubernetes Dashboard into the cluster.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install Node.js](https://nodejs.org/en/download/)
3. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
4. [Install `aws-iam-authenticator`](https://docs.aws.amazon.com/eks/latest/userguide/install-aws-iam-authenticator.html)

If you'd like to follow the optional instructions in step 7 in order to deploy a Helm chart into your cluster, you'll
also need to set up the Helm client:

1. [Install the Helm client binaries](https://docs.helm.sh/using_helm/#installing-helm)
2. If you are using Helm v2, initialize the Helm client:

    ```bash
    $ helm init --client-only
    ```

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
    ```

   We recommend using `us-west-2` to host your EKS cluster as other regions (notably `us-east-1`) may have capacity
   issues that prevent EKS clusters from creating:

    ```
    Diagnostics:
      aws:eks:Cluster: eksCluster
        error: Plan apply failed: creating urn:pulumi:aws-ts-eks-example::aws-ts-eks::EKSCluster$aws:eks/cluster:Cluster::eksCluster: error creating EKS Cluster (eksCluster-233c968): UnsupportedAvailabilityZoneException: Cannot create cluster 'eksCluster-233c968' because us-east-1a, the targeted availability zone, does not currently have sufficient capacity to support the cluster. Retry and choose from these availability zones: us-east-1b, us-east-1c, us-east-1d
            status code: 400, request id: 9f031e89-a0b0-11e8-96f8-534c1d26a353
    ```

    We are tracking enabling the creation of VPCs limited to specific AZs to unblock this in `us-east-1`: pulumi/pulumi-awsx#32

4. Stand up the EKS cluster, which will also deploy the Kubernetes Dashboard:

    ```bash
    $ pulumi up
    ```

5. After 10-15 minutes, your cluster will be ready, and the kubeconfig JSON you'll use to connect to the cluster will
   be available as an output. You can save this kubeconfig to a file like so:

    ```bash
    $ pulumi stack output kubeconfig --show-secrets >kubeconfig.json
    ```

    Once you have this file in hand, you can interact with your new cluster as usual via `kubectl`:

    ```bash
    $ KUBECONFIG=./kubeconfig.json kubectl get nodes
    ```


6. You can now connect to the Kubernetes Dashboard by fetching an authentication token and starting the kubectl proxy.

    - Fetch an authentication token:

        ```bash
        $ KUBECONFIG=./kubeconfig.json kubectl -n kube-system get secret | grep eks-admin | awk '{print $1}'
        eks-admin-token-b5zv4
        $ KUBECONFIG=./kubeconfig.json kubectl -n kube-system describe secret eks-admin-token-b5zv4
        Name:         eks-admin-token-b5zv4
        Namespace:    kube-system
        Labels:       <none>
        Annotations:  kubernetes.io/service-account.name=eks-admin
                      kubernetes.io/service-account.uid=bcfe66ac-39be-11e8-97e8-026dce96b6e8

        Type:  kubernetes.io/service-account-token

        Data
        ====
        token:      <authentication_token>
        ca.crt:     1025 bytes
        namespace:  11 bytes
        ```

    - Run the kubectl proxy:

        ```bash
        $ KUBECONFIG=./kubeconfig.json kubectl proxy
        ```

    - Open `http://localhost:8001/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/` in a web
      browser.
    - Choose `Token` authentication, paste the token retrieved earlier into the `Token` field, and sign in.

7. From there, feel free to experiment. Make edits and run `pulumi up` to incrementally update your stack.
   For example, in order to deploy a Helm chart into your cluster, import the `@pulumi/kubernetes/helm` package,
   add a `Chart` resource that targets the EKS cluster to `index.ts`, and run `pulumi up`. Note that the Helm client
   must be set up in order for the chart to deploy. For more details, see the [Prerequisites](#prerequisites) list.

    ```typescript
    import * as helm from "@pulumi/kubernetes/helm";

    // ... existing code here ...

    const myk8s = new k8s.Provider("myk8s", {
        kubeconfig: cluster.kubeconfig.apply(JSON.stringify),
    });

    const postgres = new helm.v2.Chart("postgres", {
        // stable/postgresql@0.15.0
        repo: "stable",
        chart: "postgresql",
        version: "0.15.0",
        values: {
            // Use a stable password.
            postgresPassword: "some-password",
            // Expose the postgres server via a load balancer.
            service: {
                type: "LoadBalancer",
            },
        },
    }, { providers: { kubernetes: myk8s } });
    ```

    Once the chart has been deployed, you can find its public, load-balanced endpoint via the Kubernetes Dashboard.

8. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
