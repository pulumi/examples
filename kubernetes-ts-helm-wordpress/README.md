[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-ts-helm-wordpress/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-ts-helm-wordpress/README.md#gh-dark-mode-only)

# WordPress Helm chart

Uses the Helm API of `@pulumi/kubernetes` to deploy `v9.6.0` of the WordPress Helm chart to a
Kubernetes cluster. Pulumi will expand the Helm chart and submit the expanded YAML to the cluster.

![wordpress](images/deploy.gif "WordPress Helm Chart deployment")

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
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
    Updating (ts-helm-wordpress)

         Type                                         Name                         Status
     +   pulumi:pulumi:Stack                          wordpress-ts-helm-wordpress  created
     +   └─ kubernetes:helm.sh:Chart                  wpdev                        created
     +      ├─ kubernetes:core:Secret                 default/wpdev-mariadb        created
     +      ├─ kubernetes:core:Secret                 wpdev-wordpress              created
     +      ├─ kubernetes:core:PersistentVolumeClaim  wpdev-wordpress              created
     +      ├─ kubernetes:core:Service                wpdev-wordpress              created
     +      ├─ kubernetes:core:ConfigMap              default/wpdev-mariadb        created
     +      ├─ kubernetes:core:Service                default/wpdev-mariadb        created
     +      ├─ kubernetes:apps:StatefulSet            default/wpdev-mariadb        created
     +      └─ kubernetes:apps:Deployment             wpdev-wordpress              created

    Outputs:
        wordpressIP: "35.193.210.254"

    Resources:
        + 10 created

    Duration: 53s
    ```

1.  We can see in the `Outputs:` section that WordPress was allocated a public IP, in this
    case `35.193.210.254`. It is exported with a stack output variable, `wordpressIP`. Use `curl`
    and `grep` to retrieve the `<title>` of the site the proxy points at:

    ```bash
    curl -sL $(pulumi stack output wordpressIP):80 | grep "<title>"
    ```

    ```
    <title>User&#039;s Blog! &#8211; Just another WordPress site</title>
    ```

    You can also navigate to the site in a web browser.

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
