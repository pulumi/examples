[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-go-configmap-rollout/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-go-configmap-rollout/README.md#gh-dark-mode-only)

# App Rollout via ConfigMap Data Change

Uses nginx to reverse-proxy traffic to `pulumi.github.io`. The nginx configuration is contained in
the file `default.conf` in this directory; this program reads that file and puts it in a
`ConfigMap`. Hence, changing data in that file will cause register as a change in the `ConfigMap`'s
data, which will trigger a rollout of the nginx `Deployment`.

![configmapRollout](images/rollout.gif "ConfigMap-induced Rollout")

## Running the App

Follow the steps in [Pulumi Installation and Setup](https://www.pulumi.com/docs/get-started/install/) and
[Configuring Pulumi Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/) to
get setup with Pulumi and Kubernetes.

Install dependencies:

```sh
go mod download
```

Create a new stack:

```sh
$ pulumi stack init
Enter a stack name: configmap-rollout-dev
```

This example will attempt to expose the `nginx` deployment to the Internet with
a `Service` of type `LoadBalancer`. Since minikube does not support
`LoadBalancer`, the application already knows to use type `ClusterIP` instead;
all you need to do is to tell it whether you're deploying to minikube:

```sh
pulumi config set isMinikube <value>
```

Perform the deployment:

```sh
$ pulumi up
Updating stack 'configmap-rollout-dev'
Performing changes:

     Type                           Name                                     Status      Info
 +   pulumi:pulumi:Stack            configmap-rollout-configmap-rollout-dev  created
 +   ├─ kubernetes:core:ConfigMap   nginx                                    created
 +   ├─ kubernetes:apps:Deployment  nginx                                    created
 +   └─ kubernetes:core:Service     nginx                                    created

---outputs:---
frontendIp: "35.193.210.254"

info: 4 changes performed:
    + 4 resources created
Update duration: 49.612528861s

Permalink: https://app.pulumi.com/hausdorff/configmap-rollout-dev/updates/1
```

We can see here in the `---outputs:---` section that our proxy was allocated a public IP, in this
case `35.193.210.254`. It is exported with a stack output variable, `frontendIp`. We can use `curl`
and `grep` to retrieve the `<title>` of the site the proxy points at.

```sh
$ curl -sL $(pulumi stack output frontendIp):80 | grep -C 1 "<title>"

    <title>Pulumi. Serverless // Containers // Infrastructure // Cloud // DevOps</title>
```

Now, open `default.conf` and change `.node.server` and `.server.location.proxy_set_header` to point
at `google.com`. If you're on macOS you can run `sed -i bak "s/pulumi.github.io/google.com/g" default.conf`

The result should look like this:

```conf
upstream node {
  server google.com;
}
server {
  listen                  80;
  server_name             _;
  root                    /usr/share/nginx/html;
  location / {
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header Host google.com;
    proxy_pass http://node;
    proxy_redirect off;
    port_in_redirect off;
  }
}
```

Running `preview` now shows that this change will cause us to replace the `ConfigMap` with a new one
containing the new data, and subsequently trigger a rollout in the `Deployment`.

> NOTE: This rollout is safe! Pulumi executes this plan with the following steps:
>
> 1. Create a new `ConfigMap` with a new name and the new data.
> 1. Update the `PodTemplate` of the `Deployment` to point at the new `ConfigMap`. This update
>    triggers the `Deployment` controller to try to roll out a new set of containers with mounts
>    that contain this new data.
> 1. Only once that succeeds, delete the old `ConfigMap`.

```sh
Previewing update of stack 'configmap-rollout-dev'
     Type                           Name                                     Status        Info
 *   pulumi:pulumi:Stack            configmap-rollout-configmap-rollout-dev  no change
 +-  ├─ kubernetes:core:ConfigMap   nginx                                    replace       changes: ~ data,metadata
 ~   └─ kubernetes:apps:Deployment  nginx                                    update        changes: ~ spec

info: 2 changes previewed:
    ~ 1 resource to update
    +-1 resource to replace
      2 resources unchanged
```

Running `pulumi up` should similarly look something like this:

```sh
Updating stack 'configmap-rollout-dev'
     Type                           Name                                     Status       Info
 *   pulumi:pulumi:Stack            configmap-rollout-configmap-rollout-dev  done
 +-  ├─ kubernetes:core:ConfigMap   nginx                                    replaced     changes: ~ data,metadata
 ~   └─ kubernetes:apps:Deployment  nginx                                    updated      changes: ~ spec

---outputs:---
frontendIp: "35.193.210.254"

info: 2 changes performed:
    ~ 1 resource updated
    +-1 resource replaced
      2 resources unchanged
Update duration: 5.679919856s

Permalink: https://app.pulumi.com/hausdorff/configmap-rollout-dev/updates/13
```

Now, if we `curl` the IP address once more, we see that it points at google.com!

> _Note_: minikube does not support type `LoadBalancer`; if you are deploying to minikube, make sure
> to run `kubectl port-forward svc/frontend 8080:80` to forward the cluster port to the local
> machine and access the service via `localhost:8080`.

```sh
$ curl -sL $(pulumi stack output frontendIp) | grep -o "<title>Google</title>"
<title>Google</title>
```
