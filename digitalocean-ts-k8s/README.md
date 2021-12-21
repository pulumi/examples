[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/digitalocean-ts-k8s/README.md)

# DigitalOcean Kubernetes Cluster and Application

This example provisions a new DigitalOcean Kubernetes cluster, deploys a load-balanced application into it, and then optionally configures DigitalOcean DNS records to give the resulting application a stable domain-based URL.

## Deploying the Example

### Prerequisites

To follow this example, you will need:

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Register for a DigitalOcean Account](https://cloud.digitalocean.com/registrations/new)
1. [Generate a DigitalOcean personal access token](https://www.digitalocean.com/docs/api/create-personal-access-token/)
1. [Install `kubectl` for accessing your cluster](https://kubernetes.io/docs/tasks/tools/install-kubectl/)

If you want to configure the optional DigitalOcean DNS records at the end, you will also need:

1. Obtain a domain name and [configure it to use DigitalOcean nameservers](https://www.digitalocean.com/community/tutorials/how-to-point-to-digitalocean-nameservers-from-common-domain-registrars)

### Steps

After cloning this repo, from this working directory, run these commands:

1. Install the required Node.js packages:

    This installs the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program.

    ```bash
    $ npm install
    ```

1. Create a new Pulumi stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init dev
    ```

1. Configure Pulumi to use your DigitalOcean personal access token:

    ```bash
    $ pulumi config set digitalocean:token <YOUR_TOKEN_HERE> --secret
    ```

1. (Optional) If you wish to use a custom domain name, configure it now:

    ```bash
    $ pulumi config set domainName <YOUR_DOMAIN_NAME>
    ```

1. Deploy your cluster, application, and optional DNS records by running `pulumi up`.

   This command shows a preview of the resources that will be created and asks you
   whether to proceed with the deployment. Select "yes" to perform the deployment.

    ```bash
    $ pulumi up
    Updating (dev):

         Type                                     Name        Status
     +   pulumi:pulumi:Stack                      do-k8s-dev  created
     +   └─ digitalocean:index:KubernetesCluster  do-cluster  created
     +   ├─ pulumi:providers:kubernetes           do-k8s      created
     +   ├─ kubernetes:apps:Deployment            do-app-dep  created
     +   └─ kubernetes:core:Service               do-app-svc  created
     +   ├─ digitalocean:index:Domain             do-domain        created
     +   └─ digitalocean:index:DnsRecord          do-domain-cname  created

    Outputs:
     + kubeconfig: "..."
     + ingressIp : "157.230.199.202"

    Resources:
        + 7 created

    Duration: 6m5s

    Permalink: https://app.pulumi.com/.../do-k8s/dev/updates/1
    ```

   Note that the entire deployment will typically take between 4-8 minutes.

   As part of the update, you'll see some new objects in the output, including
   a `Deployment` resource for the NGINX app, and a LoadBalancer `Service` to
   publicly access NGINX, for example.

1. After 3-5 minutes, your cluster will be ready, and the kubeconfig JSON you'll
   use to connect to the cluster will be available as an output.

   To access your cluster, save your `kubeconfig` stack output to a file and then
   use that when running the `kubectl` command. For instance, this lists your pods:

    ```bash
    $ pulumi stack output kubeconfig --show-secrets > kubeconfig
    $ KUBECONFIG=./kubeconfig kubectl get pods
    ```

1. Pulumi understands which changes to a given cloud resource can be made in-place,
   and which require replacement, and computes the minimally disruptive change to
   achieve the desired state. Let's make a small change:

    ```bash
    $ pulumi config set appReplicaCount 7
    ```

   And then rerun `pulumi up`. Notice that it shows the preview of the changes,
   including a diff of the values changed. Select "yes" to perform the update.

1. From here, feel free to experiment a little bit. Once you've finished experimenting,
   tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```

   This not only removes the underlying DigitalOcean cloud resources, but also
   deletes the stack and its history from Pulumi also.
