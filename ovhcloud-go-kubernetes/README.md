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

## Usage sample

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
