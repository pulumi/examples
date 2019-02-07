[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# AWS EKS Cluster

This example deploys an EKS Kubernetes cluster with an EBS-backed StorageClass, and deploys a Kubernetes Namespace and Deployment of NGINX
into the cluster.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://pulumi.io/install)
2. [Install Node.js 8.11.3](https://nodejs.org/en/download/)
3. [Configure AWS Credentials](https://pulumi.io/install/aws.html)
4. [Install `aws-iam-authenticator`](https://docs.aws.amazon.com/eks/latest/userguide/getting-started.html#get-started-kubectl)

### Steps

After cloning this repo, from this working directory, run these commands:

1. Install the required Node.js packages:

    ```bash
    $ npm install
    ```

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```

1. Set the required configuration variables for this program:

    ```bash
    $ pulumi config set aws:region us-west-2
    ```

1. Stand up the EKS cluster, which will also deploy the Kubernetes Dashboard:

    ```bash
    $ pulumi up
    ```

1. After 10-15 minutes, your cluster will be ready, and the kubeconfig JSON you'll use to connect to the cluster will
   be available as an output.

    As part of the update, you'll see some new objects in the output: a
    `Namespace` in Kubernetes to deploy into, a `Deployment` resource for
    the NGINX app, and a LoadBalancer `Service` to publicly access NGINX.

    Pulumi understands which changes to a given cloud resource can be made
    in-place, and which require replacement, and computes
    the minimally disruptive change to achieve the desired state.

    ```
    ...

    + deploymentName : "helloworld-58jkmc7c"
    ...
    + namespaceName  : "helloworld-xaldhgca"
    + serviceHostname: "a71f5ab3f2a6e11e3ac39200f4a9ad5d-1297981966.us-west-2.elb.amazonaws.com"
    + serviceName    : "helloworld-3fc2uhh7"
    ```

    To access your new Kubernetes cluster using `kubectl`, we need to setup the
    `kubeconfig` file and download `kubectl`. We can leverage the Pulumi
    stack output in the CLI, as Pulumi faciliates exporting these objects for us.

    ```bash
    $ pulumi stack output kubeconfig > kubeconfig
    $ export KUBECONFIG=$PWD/kubeconfig
    $ export KUBERNETES_VERSION=1.11.5 && sudo curl -s -o /usr/local/bin/kubectl https://storage.googleapis.com/kubernetes-release/release/v${KUBERNETES_VERSION}/bin/linux/amd64/kubectl && sudo chmod +x /usr/local/bin/kubectl

    $ kubectl version
    $ kubectl cluster-info
    $ kubectl get nodes
    ```

1. From there, feel free to experiment. Simply making edits and running `pulumi up` afterwords, will incrementally update your stack.

   For example, if you wish to pull in existing Kubernetes YAML manifests into
   Pulumi to aid in your transition, append the following code block to the existing
   `index.ts` file and run `pulumi up`.

   This is an example of how to create the standard Kubernetes Guestbook manifests in
   Pulumi using the Guestbook its YAML manifests. We take the additional steps of transforming
   its properties to use the same Namespace and metadata labels that
   the NGINX stack uses, and also make its frontend service use a
   LoadBalancer typed Service to expose it publicly.

	```typescript
    // Create resources for the Kubernetes Guestbook from its YAML manifests
    const guestbook = new k8s.yaml.ConfigFile("guestbook", {
        file: "https://raw.githubusercontent.com/pulumi/pulumi-kubernetes/master/examples/yaml-guestbook/yaml/guestbook.yaml",
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
        ]
    });
	```

1. Access the Kubernetes workloads using `kubectl` and Pulumi

    We can also use the stack output to query the cluster for our newly created Deployment:

    ```bash
    $ kubectl get deployment $(pulumi stack output deploymentName) --namespace=$(pulumi stack output namespaceName)
    $ kubectl get service $(pulumi stack output serviceName) --namespace=$(pulumi stack output namespaceName)
    ```

    We can also create another NGINX Deployment into the `default` namespace using
    `kubectl` natively:

    ```
    $ kubectl create deployment my-nginx --image=nginx
    $ kubectl get pods
    $ kubectl delete deployment my-nginx
    ```

1. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
