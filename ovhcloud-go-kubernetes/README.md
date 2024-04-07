# Managed Kubernetes on OVH

## Prerequisites

You need to setup some environment variables to use this template

```bash
# Your OVH project ID
export OVH_SERVICE_NAME=xxx
# Your application information (can be on https://api.ovh.com/createToken)
export OVH_APPLICATION_SECRET=xxx
export OVH_APPLICATION_KEY=xxx
export OVH_CONSUMER_KEY=xxx
```

## Configuration

You can easily configure your setup in `Pulumi.yaml`

| Key               | Description                                  | Default value |
|-------------------|----------------------------------------------|---|
| cluster:flavor    | Default size for cluster nodes               | d2-4 |
| cluster:name      | Cluster name                                 | pulumi-cluster |
| cluster:nodepool  | Nodepool name                                | pulumi-pool |
| cluster:min_nodes | Minimum nb of nodes in cluster               | 1 |
| cluster:max_nodes | Minimum nb of nodes in cluster               | 2 |
| cluster:region    | Datacenter in which cluster will be deployed | GRA9 |
| ovh:endpoint | Endpoint for OVH APIs                        | ovh-eu |

## Usage sample

### Initialization

If you haven't already, follow the steps in [Pulumi Installation and Setup](https://www.pulumi.com/docs/get-started/install/) and [Configuring Pulumi Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/) to get set up with Pulumi and Kubernetes.

Then, run command to install go dependencies:

```sh
go mod download
````

### pulumi init

If no stack initialized, run the classic `pulumi stack init` command first

### pulumi preview

```console
$ pulumi preview
Please choose a stack, or create a new one: gitpod
Previewing update (gitpod)

View in Browser (Ctrl+O): https://app.pulumi.com/yodamad/hashnode-article/gitpod/previews/xxx

     Type                              Name                     Plan       
 +   pulumi:pulumi:Stack               hashnode-article-gitpod  create     
 +   ├─ ovh:CloudProject:Kube          pulumi-cluster           create     
 +   └─ ovh:CloudProject:KubeNodePool  pulumi-pool              create     

Outputs:
    kubeconfig: output<string>

Resources:
    + 3 to create
```

### pulumi up

```console
$ pulumi up
Please choose a stack, or create a new one: gitpod
Previewing update (gitpod)

View in Browser (Ctrl+O): https://app.pulumi.com/yodamad/hashnode-article/gitpod/previews/xxx

     Type                              Name                     Plan       
 +   pulumi:pulumi:Stack               hashnode-article-gitpod  create     
 +   ├─ ovh:CloudProject:Kube          pulumi-cluster           create     
 +   └─ ovh:CloudProject:KubeNodePool  pulumi-pool              create     

Outputs:
    kubeconfig: output<string>

Resources:
    + 3 to create

Do you want to perform this update? yes
Updating (gitpod)

View in Browser (Ctrl+O): https://app.pulumi.com/xxx/xxx/gitpod/updates/1

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

### Retrieve `kubeconfig``

```bash
pulumi stack output kubeconfig --show-secrets > kubeconfig
``````
