[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-java-gke-hello-world/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-java-gke-hello-world/README.md#gh-dark-mode-only)

# Google Kubernetes Engine (GKE) cluster

This example deploys a Google Cloud Platform (GCP) [Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine/) cluster and deploys a Kubernetes Namespace and Deployment of NGINX.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
3. [Install Java](https://www.pulumi.com/docs/intro/languages/java/)
4. [Install the Google Cloud SDK (`gcloud`)](https://cloud.google.com/sdk/docs/downloads-interactive)
5. Configure GCP auth by logging in with `gcloud`:

    ```bash
    gcloud auth login
    gcloud config set project <YOUR_GCP_PROJECT_HERE>
    gcloud auth application-default login
    ```

    > Note: This auth mechanism is meant for inner loop developer workflows. If you want to run this example in an unattended service account setting, such as in CI/CD, please [follow instructions to configure your service account](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/). The service account must have the role `Kubernetes Engine Admin` / `container.admin`.

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Set the required GCP configuration variables:

    ```bash
    pulumi config set gcp:project <YOUR_GCP_PROJECT_HERE>
    pulumi config set gcp:zone us-west1-a
    ```

1. Stand up the GKE cluster by running `pulumi up`. Note that provisioning a new GKE cluster takes ~10 minutes:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev)

         Type                              Name                          Status
     +   pulumi:pulumi:Stack               gcp-java-gke-hello-world-dev  created
     +   ├─ gcp:container:Cluster          helloworld                    created
     +   ├─ gcp:container:NodePool         primary-node-pool             created
     +   ├─ pulumi:providers:kubernetes    helloworld                    created
     +   ├─ kubernetes:core/v1:Namespace   helloworld                    created
     +   ├─ kubernetes:apps/v1:Deployment  helloworld                    created
     +   └─ kubernetes:core/v1:Service     helloworld                    created

    Outputs:
        clusterName    : "helloworld-10e2053"
        deploymentName : "helloworld-krnibosh"
        kubeconfig     : "[secret]"
        masterVersion  : "1.22.6-gke.300"
        namespaceName  : "helloworld-p2a10vq4"
        serviceName    : "helloworld-h7jipvp8"
        servicePublicIP: "***"

    Resources:
        + 7 created

    Duration: 11m18s
    ```

1. After ~10 minutes, your cluster will be ready, and the kubeconfig JSON you'll use to connect to the cluster will be available as an output.

    As part of the update, you'll see some new objects in the output: a `Namespace` in Kubernetes to deploy into, a `Deployment` resource for the NGINX app, and a LoadBalancer `Service` to publicly access NGINX.

    Pulumi understands which changes to a given cloud resource can be made in-place, and which require replacement, and computes the minimally disruptive change to achieve the desired state.

    > **Note:** Pulumi auto-generates a suffix for all objects. See the [Pulumi Programming Model](https://www.pulumi.com/docs/intro/concepts/resources/#autonaming) for more info.
    >
    > ```
    > clusterName    : "helloworld-10e2053"
    > deploymentName : "helloworld-krnibosh"
    > kubeconfig     : "[secret]"
    > masterVersion  : "1.22.6-gke.300"
    > namespaceName  : "helloworld-p2a10vq4"
    > serviceName    : "helloworld-h7jipvp8"
    > servicePublicIP: "***"
    > ```

    If you visit the FQDN listed in `servicePublicIP` you should land on the NGINX welcome page. Note that it may take a minute or so for the LoadBalancer to become active on GCP.

1. Access the Kubernetes cluster using `kubectl`. To access your new Kubernetes cluster using `kubectl`, set up the `kubeconfig` file and download `kubectl`. Leverage the Pulumi stack output in the CLI, as Pulumi facilitates exporting these objects for us:

    ```bash
    pulumi stack output kubeconfig --show-secrets > kubeconfig
    export KUBECONFIG=$PWD/kubeconfig
    export KUBERNETES_VERSION=1.11.6 && sudo curl -s -o /usr/local/bin/kubectl https://storage.googleapis.com/kubernetes-release/release/v${KUBERNETES_VERSION}/bin/linux/amd64/kubectl && sudo chmod +x /usr/local/bin/kubectl

    kubectl version
    kubectl cluster-info
    kubectl get nodes
    ```

    You can also use the stack output to query the cluster for your newly created Deployment:

    ```bash
    kubectl get deployment $(pulumi stack output deploymentName) --namespace=$(pulumi stack output namespaceName)
    kubectl get service $(pulumi stack output serviceName) --namespace=$(pulumi stack output namespaceName)
    ```

    You can also create another NGINX Deployment into the `default` namespace using `kubectl` natively:

    ```bash
    kubectl create deployment my-nginx --image=nginx
    kubectl get pods
    kubectl delete deployment my-nginx
    ```

    By doing so, these resources are outside of Pulumi's purview, but this simply demonstrates that all the `kubectl` commands you're used to will work.

1. From here on, feel free to experiment. Simply making edits and running `pulumi up` afterwards will incrementally update your stack.

## Cleaning up

Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

```bash
pulumi destroy
pulumi stack rm
```
