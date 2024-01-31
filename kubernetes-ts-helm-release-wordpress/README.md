[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-ts-helm-release-wordpress/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-ts-helm-release-wordpress/README.md#gh-dark-mode-only)

# Wordpress Helm Chart Deployed Using Helm Release Resource

Uses the Helm Release API of `@pulumi/kubernetes` to deploy `v13.0.6` of the Wordpress Helm Chart to a
Kubernetes cluster. The Helm Release resource will install the Chart mimicing behavior of the Helm CLI.

![wordpress](images/deploy.gif "Wordpress Helm Release deployment")

## Running the App

If you haven't already, follow the steps in [Pulumi Installation and
Setup](https://www.pulumi.com/docs/get-started/install/) and [Configuring Pulumi
Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/) to get set up with
Pulumi and Kubernetes.

Now, install dependencies:

```sh
yarn install
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

View Live: https://app.pulumi.com/.../ts-helm-release-wordpress/dev/previews/35cee070-ade3-4957-b96d-cff276255813

     Type                              Name                           Plan
 +   pulumi:pulumi:Stack               ts-helm-release-wordpress-dev  create
 +   └─ kubernetes:helm.sh/v3:Release  wpdev                          create

Resources:
    + 2 to create

Do you want to perform this update? yes
Updating (dev)

View Live: https://app.pulumi.com/.../ts-helm-release-wordpress/dev/updates/1

     Type                              Name                           Status
 +   pulumi:pulumi:Stack               ts-helm-release-wordpress-dev  created
 +   └─ kubernetes:helm.sh/v3:Release  wpdev                          created
     └─ kubernetes:core/v1:Service     wpdev-wordpress

Outputs:
    frontendIp: "10.96.206.152"
    portForwardCommand: "kubectl port-forward svc/wpdev-vaj5az35-wordpress 8080:80"
Resources:
    + 2 to create

Duration: 1m9s
```

We can see here in the `---outputs:---` section that Wordpress was allocated a Cluster IP, in this
case `10.96.206.152`. It is exported with a stack output variable, `frontendIp`. Since this is a Cluster IP, you will need to port-forward to the service in order to hit the endpoint at `http://localhost:8080`
by running the port-forward command specified in `portForwardCommand`.

You can navigate to the site in a web browser.

When you're done, you can remove these resources with `pulumi destroy`:

```sh
pulumi destroy --skip-preview
Destroying (dev)

View Live: https://app.pulumi.com/.../ts-helm-release-wordpress/dev/updates/5

     Type                              Name                           Status
 -   pulumi:pulumi:Stack               ts-helm-release-wordpress-dev  deleted
 -   └─ kubernetes:helm.sh/v3:Release  wpdev                          deleted

Outputs:
  - frontendIp        : "10.96.206.152"
  - portForwardCommand: "kubectl port-forward svc/wpdev-vaj5az35-wordpress 8080:80"

Resources:
    - 2 deleted

Duration: 16s

The resources in the stack have been deleted, but the history and configuration associated with the stack are still maintained.
If you want to remove the stack completely, run 'pulumi stack rm dev'.
```
