[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-ts-s3-rollout/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-ts-s3-rollout/README.md#gh-dark-mode-only)

# App rollout via data change in Amazon S3

This example is similar in principle to the [`ConfigMap`-based rollout example][rollout], except a
rollout is triggered any time the data in S3 changes.

Like the `ConfigMap`-based example, this one uses NGINX to reverse-proxy traffic to
`pulumi.github.io`. The NGINX configuration is contained in the file `default.conf` in this
directory; this program reads that file and puts it into an S3 bucket. Hence, changing data in that
file will register as a change in the S3 bucket's data, which will trigger a rollout of the
NGINX `Deployment`.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Configure Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/)
4. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-west-2
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Updating stack 's3-kube'
    Performing changes:

         Type                           Name                  Status      Info
     +   pulumi:pulumi:Stack            data-from-s3-s3-kube  created
     +   ├─ aws:s3:Bucket               nginx-configs         created
     +   ├─ aws:s3:BucketPolicy         bucketPolicy          created
     +   ├─ aws:s3:BucketObject         default.conf          created
     +   ├─ kubernetes:apps:Deployment  nginx                 created
     +   └─ kubernetes:core:Service     nginx                 created

        ---outputs:---
        defaultConfUrl: "nginx-configs-4b9ea08.s3.amazonaws.com/default.conf"
        frontendIp    : "35.224.120.207"

    info: 6 changes performed:
        + 6 resources created
    Update duration: 1m21.870672089s
    ```

1.  We can see here in the `---outputs:---` section that our proxy was allocated a public IP, in this
    case `35.224.120.207`. It is exported with a stack output variable, `frontendIp`. Use `curl`
    and `grep` to retrieve the `<title>` of the site the proxy points at:

    ```bash
    curl -sL $(pulumi stack output frontendIp):80 | grep -C 1 "<title>"
    ```

    ```
    <title>Pulumi. Serverless // Containers // Infrastructure // Cloud // DevOps</title>
    ```

### Trigger a rollout by changing the data

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

Running `preview` now shows that this change will cause us to replace the S3 bucket with a new one
containing the new data, and subsequently trigger a rollout in the `Deployment`.

> NOTE: This rollout is safe! Pulumi executes this plan with the following steps:
>
> 1. Create a new S3 bucket with a new name and the new data.
> 1. Update the `PodTemplate` of the `Deployment` to point at the new S3 bucket. This update
>    triggers the `Deployment` controller to try to roll out a new set of containers with mounts
>    that contain this new data.
> 1. Only once that succeeds, delete the old S3 bucket.

```
Previewing update of stack 's3-kube'
     Type                           Name                                     Status        Info
 *   pulumi:pulumi:Stack            configmap-rollout-configmap-rollout-dev  no change
 +-  ├─ kubernetes:core:ConfigMap   nginx                                    replace       changes: ~ data,metadata
 ~   └─ kubernetes:apps:Deployment  nginx                                    update        changes: ~ spec

info: 2 changes previewed:
    ~ 1 resource to update
    +-1 resource to replace
      2 resources unchanged
```

Running `pulumi up` would actually attempt to achieve these results.

Now, if we `curl` the IP address once more, we see that it points at google.com!

> *Note*: minikube does not support type `LoadBalancer`; if you are deploying to minikube, make sure
> to run `kubectl port-forward svc/frontend 8080:80` to forward the cluster port to the local
> machine and access the service via `localhost:8080`.

```bash
curl -sL $(pulumi stack output frontendIp) | grep -o "<title>Google</title>"
```

```
<title>Google</title>
```

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```

[rollout]: https://github.com/pulumi/examples/tree/master/kubernetes-ts-configmap-rollout
