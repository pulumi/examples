[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Google Kubernetes Engine (GKE) Cluster

This example deploys an Google Cloud [Google Kubernetes Engine (GKE)](https://cloud.google.com/kubernetes-engine/) cluster with Autopilot enabled, and deploys a Kubernetes Namespace and Deployment of NGINX
using the Google-Native provider for Pulumi.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Install Node.js](https://nodejs.org/en/download/)
1. Install a package manager for Node.js, such as [npm](https://www.npmjs.com/get-npm) or [Yarn](https://yarnpkg.com/en/docs/install).
1. [Install Google Cloud SDK (`gcloud`)](https://cloud.google.com/sdk/docs/downloads-interactive)
1. Configure Google Cloud Auth

    * Login using `gcloud`

        ```bash
        $ gcloud auth login
        $ gcloud config set project <YOUR_GOOGLE_CLOUD_PROJECT_HERE>
        $ gcloud auth application-default login
        ```
    > Note: This auth mechanism is meant for inner loop developer
    > workflows. If you want to run this example in an unattended service
    > account setting, such as in CI/CD, please [follow instructions to
    > configure your service account](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/). The
    > service account must have the role `Kubernetes Engine Admin` / `container.admin`.

### Steps

After cloning this repo, from this working directory, run these commands:

1. Install the required Node.js packages:

    This installs the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program.

    ```bash
    $ npm install
    ```

1. Create a new Pulumi stack, which is an isolated deployment target for this example:

    This will initialize the Pulumi program in TypeScript.

    ```bash
    $ pulumi stack init
    ```

1. Set the required Google Cloud configuration variables:

    This sets configuration options and default values for our cluster.

    ```bash
    $ pulumi config set google-native:project <YOUR_GOOGLE_CLOUD_PROJECT_HERE>
    $ pulumi config set google-native:region us-west1     // any valid Google Cloud Zone here
    ```

1. Stand up the GKE cluster:

    To preview and deploy changes, run `pulumi update` and select "yes."

    The `update` sub-command shows a preview of the resources that will be created
    and prompts on whether to proceed with the deployment. Note that the stack
    itself is counted as a resource, though it does not correspond
    to a physical cloud resource.

    You can also run `pulumi up --diff` to see and inspect the diffs of the
    overall changes expected to take place.

    Running `pulumi up` will deploy the GKE cluster. Note, provisioning a
    new GKE cluster with Autopilot takes between 5-10 minutes.

    ```bash
    $ pulumi update
	...

     Type                                        Name                                           Status      Info
     pulumi:pulumi:Stack                         google-native-ts-gke-autopilot-helloworld-dev          
 +   ├─ google-native:container/v1beta1:Cluster  cluster                                        created
 +   ├─ pulumi:providers:kubernetes              k8sprovider                                    created
 +   ├─ kubernetes:core/v1:Namespace             helloworld                                     created
 +   ├─ kubernetes:apps/v1:Deployment            helloworld                                     created
 +   └─ kubernetes:core/v1:Service               helloworld                                     created

	Outputs:
		clusterName    : "helloworld-e1557dc"
		deploymentName : "helloworld-tlsr4sg5"
		kubeconfig     : "<KUBECONFIG_CONTENTS>"
		namespaceName  : "helloworld-pz4u5kyq"
		serviceName    : "helloworld-l61b5dby"
		servicePublicIP: "35.236.26.151"

	Resources:
		+ 6 created

	Duration: 3m51s
    ```

1. After 3-5 minutes, your cluster will be ready, and the kubeconfig JSON you'll use to connect to the cluster will
   be available as an output.

    As part of the update, you'll see some new objects in the output: a
    `Namespace` in Kubernetes to deploy into, a `Deployment` resource for
    the NGINX app, and a LoadBalancer `Service` to publicly access NGINX.

    Pulumi understands which changes to a given cloud resource can be made
    in-place, and which require replacement, and computes
    the minimally disruptive change to achieve the desired state.

	> **Note:** Pulumi auto-generates a suffix for all objects.
    > See the [Pulumi Programming Model](https://www.pulumi.com/docs/intro/concepts/resources/#autonaming) for more info.
    >
    > ```
    > clusterName    : "helloworld-2a6de9a"
	> deploymentName : "helloworld-tlsr4sg5"
    > kubeconfig     : "<KUBECONFIG_CONTENTS>"
	> namespaceName  : "helloworld-pz4u5kyq"
	> serviceName    : "helloworld-l61b5dby"
	> servicePublicIP: "35.236.26.151"
    > ```

    If you visit the FQDN listed in `servicePublicIP` you should land on the
    NGINX welcome page. Note, that it may take a minute or so for the
    LoadBalancer to become active on Google Cloud.

1. Access the Kubernetes Cluster using `kubectl`

    To access your new Kubernetes cluster using `kubectl`, we need to setup the
    `kubeconfig` file and download `kubectl`. We can leverage the Pulumi
    stack output in the CLI, as Pulumi facilitates exporting these objects for us.

    ```bash
    $ pulumi stack output kubeconfig --show-secrets > kubeconfig
    $ export KUBECONFIG=$PWD/kubeconfig

    $ kubectl version
    $ kubectl cluster-info
    $ kubectl get nodes
    ```

    We can also use the stack output to query the cluster for our newly created Deployment:

    ```bash
    $ kubectl get deployment $(pulumi stack output deploymentName) --namespace=$(pulumi stack output namespaceName)
    $ kubectl get service $(pulumi stack output serviceName) --namespace=$(pulumi stack output namespaceName)
    ```

    We can also create another NGINX Deployment into the `default` namespace using
    `kubectl` natively:

    ```bash
    $ kubectl create deployment my-nginx --image=nginx
    $ kubectl get pods
    $ kubectl delete deployment my-nginx
    ```

    Of course, by doing so, resources are outside of Pulumi's purview, but this simply
    demonstrates that all the `kubectl` commands you're used to will work.

1. Experimentation

    From here on, feel free to experiment. Simply making edits and running `pulumi up` afterwords, will incrementally update your stack.

    ### Running Off-the-Shelf Guestbook YAML

    For example, if you wish to pull existing Kubernetes YAML manifests into
    Pulumi to aid in your transition, append the following code block to the existing
    `index.ts` file and run `pulumi up`.

    This is an example of how to create the standard Kubernetes Guestbook manifests in
    Pulumi using the Guestbook YAML manifests. We take the additional steps of transforming
    its properties to use the same Namespace and metadata labels that
    the NGINX stack uses, and also make its frontend service use a
    LoadBalancer typed Service to expose it publicly.

    ```typescript
    // Create resources for the Kubernetes Guestbook from its YAML manifests
    const guestbook = new k8s.yaml.ConfigFile("guestbook",
        {
            file: "https://raw.githubusercontent.com/pulumi/pulumi-kubernetes/master/tests/sdk/nodejs/examples/yaml-guestbook/yaml/guestbook.yaml",
            transformations: [
                (obj: any) => {
                    // Do transformations on the YAML to use the same namespace and
                    // labels as the NGINX stack above
                    if (obj.metadata.labels) {
                        obj.metadata.labels['appClass'] = namespaceName
                    } else {
                        obj.metadata.labels = appLabels
                    }

                    // Make the 'frontend' Service public by setting it to be of type
                    // LoadBalancer
                    if (obj.kind == "Service" && obj.metadata.name == "frontend") {
                        if (obj.spec) {
                            obj.spec.type = "LoadBalancer"
                        }
                    }
                }
            ],
        },
        {
            providers: { "kubernetes": clusterProvider },
        },
    );

    // Export the Guestbook public LoadBalancer endpoint
    export const guestbookPublicIP =
        guestbook.getResourceProperty("v1/Service", "frontend", "status").apply(s => s.loadBalancer.ingress[0].ip);
    ```

1. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
