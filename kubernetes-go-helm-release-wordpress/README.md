[![Deploy this example with Pulumi](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-go-helm-release-wordpress/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-go-helm-release-wordpress/README.md#gh-dark-mode-only)

# Wordpress Helm Chart Deployed Using Helm Release Resource

Uses the Helm Release resource in `pulumi-kubernetes` to deploy `v13.0.6` of the Wordpress Helm Chart to a
Kubernetes cluster. Pulumi will use native Helm support to deploy the chart on the target Kubernetes cluster.

![wordpress](images/deploy.gif "Wordpress Helm Release deployment")

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
Enter a stack name: dev
```

Preview the deployment of the application and the perform the deployment:

```sh
pulumi up
Previewing update (dev)

View Live: https://app.pulumi.com/.../kubernetes-go-helm-release-wordpress/dev/previews/01ac68a0-bcce-4bc8-a34c-cad12544b839

     Type                              Name                                      Plan
 +   pulumi:pulumi:Stack               kubernetes-go-helm-release-wordpress-dev  create
 +   └─ kubernetes:helm.sh/v3:Release  wpdev                                     create

Resources:
    + 2 to create

Do you want to perform this update? yes
Updating (dev)

View Live: https://app.pulumi.com/.../kubernetes-go-helm-release-wordpress/dev/updates/11

     Type                              Name                                      Status
 +   pulumi:pulumi:Stack               kubernetes-go-helm-release-wordpress-dev  created
 +   ├─ kubernetes:helm.sh/v3:Release  wpdev                                     created
     └─ kubernetes:core/v1:Service     svc

Outputs:
    frontendIp        : "10.96.109.99"
    portForwardCommand: "kubectl port-forward svc/wpdev-ysmr245n-wordpress 8080:80"

Resources:
    + 2 created

Duration: 1m13s

```

We can see here in the `---outputs:---` section that Wordpress was allocated a cluster IP, in this
case `10.96.109.99`. It is exported with a stack output variable, `frontendIp`.  Since this is a Cluster IP,
you will need to port-forward to the service in order to hit the endpoint at `http://localhost:8080`
by running the port-forward command specified in `portForwardCommand`.

You can navigate to the site in a web browser.

When you're done, you can remove these resources with `pulumi destroy`:

```sh
pulumi destroy --skip-preview
Destroying (dev)

View Live: https://app.pulumi.com/.../kubernetes-go-helm-release-wordpress/dev/updates/12

     Type                              Name                                      Status
 -   pulumi:pulumi:Stack               kubernetes-go-helm-release-wordpress-dev  deleted
 -   └─ kubernetes:helm.sh/v3:Release  wpdev                                     deleted

Outputs:
  - frontendIp        : "10.96.109.99"
  - portForwardCommand: "kubectl port-forward svc/wpdev-ysmr245n-wordpress 8080:80"

Resources:
    - 2 deleted

Duration: 8s
```
