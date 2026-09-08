[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/ovhcloud-go-kubernetes/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/ovhcloud-go-kubernetes/README.md#gh-dark-mode-only)

# Managed Kubernetes on OVH

Deploys a managed Kubernetes cluster and node pool on OVHcloud.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/)
3. [Install Go](https://www.pulumi.com/docs/intro/languages/go/)
4. Set up the environment variables used to authenticate against the OVH APIs:

   ```bash
   # Your OVH project ID
   export OVH_SERVICE_NAME=xxx
   # Your application information (can be created on https://api.ovh.com/createToken)
   export OVH_APPLICATION_SECRET=xxx
   export OVH_APPLICATION_KEY=xxx
   export OVH_CONSUMER_KEY=xxx
   ```

## Configuration

You can configure your setup in `Pulumi.yaml`:

| Key               | Description                                  | Default value |
|-------------------|----------------------------------------------|---|
| cluster:flavor    | Default size for cluster nodes               | d2-4 |
| cluster:name      | Cluster name                                 | pulumi-cluster |
| cluster:nodepool  | Nodepool name                                | pulumi-pool |
| cluster:min_nodes | Minimum number of nodes in cluster           | 1 |
| cluster:max_nodes | Maximum number of nodes in cluster           | 2 |
| cluster:region    | Datacenter in which cluster will be deployed | GRA9 |
| ovh:endpoint      | Endpoint for OVH APIs                         | ovh-eu |

## Deploying the example

1. Install dependencies:

   ```bash
   go mod download
   ```

1. Create a new stack:

   ```bash
   pulumi stack init
   ```

1. Run `pulumi up` to preview and deploy changes:

   ```bash
   pulumi up
   ```

   ```
   Updating (gitpod)

        Type                              Name                     Status
    +   pulumi:pulumi:Stack               hashnode-article-gitpod  created (405s)
    +   ├─ ovh:CloudProject:Kube          pulumi-cluster           created (401s)
    +   └─ ovh:CloudProject:KubeNodePool  pulumi-pool              created (222s)

   Outputs:
       kubeconfig: [secret]

   Resources:
       + 3 created

   Duration: 10m30s
   ```

1. Retrieve the `kubeconfig`:

   ```bash
   pulumi stack output kubeconfig --show-secrets > kubeconfig
   ```

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
