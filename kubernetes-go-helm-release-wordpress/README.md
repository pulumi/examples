[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-go-helm-wordpress/README.md)

# Wordpress Helm Chart

Uses the Helm Release API of `pulumi-kubernetes` to deploy `v13.0.6` of the Wordpress Helm Chart to a
Kubernetes cluster. Pulumi will expand the Helm Chart and submit the expanded YAML to the cluster.

## Running the App

If you haven't already, follow the steps in [Pulumi Installation and
Setup](https://www.pulumi.com/docs/get-started/install/) and [Configuring Pulumi
Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/) to get set up with
Pulumi and Kubernetes.

Now, install dependencies:

```sh
go mod download
```

Create a new stack:

```sh
$ pulumi stack init
Enter a stack name: wordpress-dev
```

Preview the deployment of the application and the perform the deployment:

```sh
pulumi up
Previewing update (wordpress-dev)

View Live: https://app.pulumi.com/...

     Type                              Name                                                 Plan
 +   pulumi:pulumi:Stack               kubernetes-go-helm-release-wordpress-wordpress-dev   create
 +   └─ kubernetes:helm.sh/v3:Release  wpdev                                                create
 
Resources:
    + 2 to create

Do you want to perform this update? yes
Updating (wordpress-dev)

View Live: https://app.pulumi.com/...

     Type                              Name                                                 Status
 +   pulumi:pulumi:Stack               kubernetes-go-helm-release-wordpress-wordpress-dev   created
 +   ├─ kubernetes:helm.sh/v3:Release  wpdev                                                created
     └─ kubernetes:core/v1:Service     frontendIp

Outputs:
    frontendIp: "10.96.85.225"

Resources:
    + 2 created

Duration: 1m4s

```

We can see here in the `---outputs:---` section that Wordpress was allocated a public IP, in this
case `10.96.85.225`. It is exported with a stack output variable, `frontendIp`. We can use `curl`
and `grep` to retrieve the `<title>` of the site the proxy points at.

```sh
$ curl -sL $(pulumi stack output frontendIp):80 | grep "<title>"
<title>User&#039;s Blog! &#8211; Just another WordPress site</title>
```

You can also navigate to the site in a web browser.

When you're done, you can remove these resources with `pulumi destroy`:

```sh
pulumi destroy --skip-preview
Destroying (wordpress-dev)

View Live: https://app.pulumi.com/example/...

     Type                              Name                                                 Status
 -   pulumi:pulumi:Stack               kubernetes-go-helm-release-wordpress-wordpress-dev   deleted
 -   └─ kubernetes:helm.sh/v3:Release  wpdev                                                deleted

Outputs:
  - frontendIp: "10.96.85.225""

Resources:
    - 2 deleted

Duration: 9s
```
