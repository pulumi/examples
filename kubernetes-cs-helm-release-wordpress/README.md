[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-cs-helm-release-wordpress/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-cs-helm-release-wordpress/README.md#gh-dark-mode-only)

# WordPress Helm chart deployed using the Helm Release resource

Uses the Helm Release API of `@pulumi/kubernetes` to deploy `v13.0.6` of the WordPress Helm chart to a
Kubernetes cluster. The Helm Release resource will install the chart, mimicking the behavior of the Helm CLI.

![wordpress](images/deploy.gif "WordPress Helm Release deployment")

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/)
3. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev)

    View Live: https://app.pulumi.com/.../kubernetes-cs-helm-release-wordpress/dev/updates/4

         Type                              Name                                      Status
     +   pulumi:pulumi:Stack               kubernetes-cs-helm-release-wordpress-dev  created
     +   ├─ kubernetes:helm.sh/v3:Release  wpdev                                     created
         └─ kubernetes:core/v1:Service     wpdev-wordpress

    Outputs:
        FrontendIP        : "10.96.224.4"
        PortForwardCommand: "kubectl port-forward svc/wpdev-277o20tl-wordpress 8080:80"

    Resources:
        + 2 created

    Duration: 1m18s
    ```

1.  WordPress was allocated a cluster IP, in this case `10.96.224.4`, exported as the stack output
    `FrontendIP`. Since this is a cluster IP, you will need to port-forward to the service in order
    to hit the endpoint at `http://localhost:8080` by running the port-forward command specified in
    `PortForwardCommand`. You can then navigate to the site in a web browser.

## Cleaning up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```
