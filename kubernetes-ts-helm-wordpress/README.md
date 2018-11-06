[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Kubernetes: Deploying the Wordpress Helm chart

Uses the Helm API of `@pulumi/kubernetes` to deploy `v2.1.3` of the Wordpress Helm Chart to a
Kubernetes cluster. **The Tiller server is not required to be installed.** Pulumi will expand the
Helm Chart and submit the expanded YAML to the cluster.

> **NOTE:** Because Tiller is not used, it is important to be aware that a small number of Charts
> depend on values that can only be expanded on the server. These variables will get default values
> instead.

> **NOTE:** This example has a dependency on the `helm` CLI. **Be sure to install that first!** See
> instructions below.

![wordpress](images/deploy.gif "Wordpress Helm Chart deployment")

## Running the App

Use the [Helm installation guide](https://docs.helm.sh/using_helm/#installing-helm) to install the
`helm` CLI. On macOS this might look something like:

```sh
brew install kubernetes-helm
```

Once `helm` is installed, initialize it with:

```sh
helm init --client-only
```

If you haven't already, follow the steps in [Pulumi Installation and
Setup](https://docs.pulumi.com/install/) and [Configuring Pulumi
Kubernetes](https://docs.pulumi.com/reference/kubernetes.html#configuration) to get setup with
Pulumi and Kubernetes.

Now, install dependencies:

```sh
npm install
```

Create a new stack:

```sh
$ pulumi stack init
Enter a stack name: wordpress-dev
```

Preview the deployment of the application.

> **TIP:** This example installs the Wordpress Chart. You can use `helm search` to find other Helm
> charts, as well as available versions for them.

Perform the deployment:

```sh
$ pulumi up
Updating stack 'wordpress-dev'
Performing changes:

     Type                                         Name                      Status      Info
 +   pulumi:pulumi:Stack                          wordpress-wordpress-dev   created     1 warning
 +   └─ kubernetes:helm.sh:Chart                  wpdev                     created
 +      ├─ kubernetes:core:ConfigMap              wpdev-mariadb             created
 +      ├─ kubernetes:core:ConfigMap              wpdev-mariadb-tests       created
 +      ├─ kubernetes:core:Secret                 wpdev-mariadb             created
 +      ├─ kubernetes:core:Secret                 wpdev-wordpress           created
 +      ├─ kubernetes:core:Service                wpdev-wordpress           created     1 warning, 2 info messages
 +      ├─ kubernetes:core:Service                wpdev-mariadb             created     1 warning, 1 info message
 +      ├─ kubernetes:core:Pod                    wpdev-credentials-test    created     17 warnings
 +      ├─ kubernetes:core:Pod                    wpdev-mariadb-test-mgjjy  created     32 warnings
 +      ├─ kubernetes:core:PersistentVolumeClaim  wpdev-wordpress           created
 +      ├─ kubernetes:apps:StatefulSet            wpdev-mariadb             created
 +      └─ kubernetes:extensions:Deployment       wpdev-wordpress           created

---outputs:---
frontendIp: "35.193.210.254"

info: 13 changes performed:
    + 13 resources created
Update duration: 1m28.601219022s

Permalink: https://app.pulumi.com/hausdorff/wordpress-dev/updates/1
```

We can see here in the `---outputs:---` section that Wordpress was allocated a public IP, in this
case `35.193.210.254`. It is exported with a stack output variable, `frontendIp`. We can use `curl`
and `grep` to retrieve the `<title>` of the site the proxy points at.

```sh
$ curl -sL $(pulumi stack output frontendIp):80 | grep "<title>"
<title>User&#039;s Blog! &#8211; Just another WordPress site</title>
```
