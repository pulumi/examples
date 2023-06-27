# Kubernetes Dependent Jobs and Waiter

This program creates two Kubernetes Jobs that run the "hello-world" image. It uses an async waitForJob function to wait for the first Job to complete, then creates a second Job with a data dependency on the first Job's completion. The program exports the IDs and status details of both Jobs.

## Deploying the Example

### Prerequisites

To follow this example, you will need:

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. A local [kubeconfig](https://kubernetes.io/docs/tasks/access-application-cluster/configure-access-multiple-clusters/) if available, or one can be passed as a [provider argument](https://www.pulumi.com/registry/packages/kubernetes/api-docs/provider#inputs) in the request.

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

1. Deploy the kubernetes jobs by running `pulumi up`.

   This command shows a preview of the resources that will be created and asks you
   whether to proceed with the deployment. Select "yes" to perform the deployment.

    ```bash
    $ pulumi up
    Updating (dev):

         Type                                     Name        Status


    Outputs:

    Resources:

    Duration: 

    Permalink: https://app.pulumi.com/.../k8s-ts-wait/dev/updates/1
    ```

   Note that the entire deployment will typically take between ## minutes.

   As part of the update, you'll see some ..

1. From here, feel free to experiment a little bit. Once you've finished experimenting,
   tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
