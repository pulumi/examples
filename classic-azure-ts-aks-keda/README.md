[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-aks-keda/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/classic-azure-ts-aks-keda/README.md#gh-dark-mode-only)

# Azure Kubernetes Service (AKS) Cluster and Azure Functions with KEDA

This example demonstrates creating an Azure Kubernetes Service (AKS) Cluster, and deploying an Azure Function App with Kubernetes-based Event Driven Autoscaling (KEDA) into it, all in one Pulumi program. Please see https://docs.microsoft.com/en-us/azure/aks/ for more information about AKS and https://docs.microsoft.com/en-us/azure/azure-functions/functions-kubernetes-keda for more information about KEDA.

## Prerequisites

Ensure you have [downloaded and installed the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/).

We will be deploying to Azure, so you will need an Azure account. If you don't have an account,
[sign up for free here](https://azure.microsoft.com/en-us/free/).
[Follow the instructions here](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/) to connect Pulumi to your Azure account.

This example deploys a Helm Chart from Kedacore Helm chart repository.

If you are using Helm v2:
```bash
$ helm init --client-only
$ helm repo add kedacore https://kedacore.github.io/charts
$ helm repo update
```

If you are using Helm v3:
```
$ helm repo add kedacore https://kedacore.github.io/charts
$ helm repo update
```

## Running the Example

After cloning this repo, `cd` into it and run these commands.

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```

2. Set the Azure region to deploy to:

    ```bash
    $ pulumi config set azure:location <value>
    ```

3. Deploy everything with the `pulumi up` command. This provisions all the Azure resources necessary, including an Active Directory service principal, AKS cluster, and then deploys the Apache Helm Chart, and an Azure Function managed by KEDA, all in a single gesture:

    > **Note**: Due to an [issue](https://github.com/terraform-providers/terraform-provider-azuread/issues/156) in Azure Terraform Provider, the
    > creation of an Azure Service Principal, which is needed to create the Kubernetes cluster (see cluster.ts), is delayed and may not
    > be available when the cluster is created.  If you get a "Service Principal not found" error, as a work around, you should be able to run `pulumi up`
    > again, at which time the Service Principal replication should have been completed. See [this issue](https://github.com/Azure/AKS/issues/1206) and
    > [this doc](https://docs.microsoft.com/en-us/azure/aks/troubleshooting#im-receiving-errors-that-my-service-principal-was-not-found-when-i-try-to-create-a-new-cluster-without-passing-in-an-existing-one)
    > for further details.

    ```bash
    $ pulumi up
    ```

4. After a couple minutes, your cluster and Azure Function app will be ready. Four output variables will be printed, reflecting your cluster name (`clusterName`), Kubernetes config (`kubeConfig`), Storage Account name (`storageAccountName`), and storage queue name (`queueName`).

   Using these output variables, you may configure your `kubectl` client using the `kubeConfig` configuration:

   ```bash
   $ pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml
   $ KUBECONFIG=./kubeconfig.yaml kubectl get deployment
   NAME           READY     UP-TO-DATE     AVAILABLE    AGE
   keda-edge      1/1       1              1            9m
   queue-handler  0/0       0              0            2m
   ```

   Now, go ahead an enqueue a new message to the storage queue. You may use a tool like [Microsoft Azure Storage Explorer](https://azure.microsoft.com/en-us/features/storage-explorer/) to navigate to the queue and add a new message.

   Wait for a minute and then query the deployments again:

   ```bash
   $ KUBECONFIG=./kubeconfig.yaml kubectl get deployment
   NAME           READY     UP-TO-DATE     AVAILABLE    AGE
   keda-edge      1/1       1              1            14m
   queue-handler  1/1       1              1            7m
   ```

   Note that the `queue-handler` deployment got 1 instance ready. Looking at the pods:

   ```bash
   $ KUBECONFIG=./kubeconfig.yaml kubectl get pod
   NAME                          READY   STATUS    RESTARTS   AGE                                    keda-edge-97664558c-q2mkd     1/1     Running   0          15m
   queue-handler-c496dcfc-mb6tx  1/1     Running   0          2m3s
   ```

   There's now a pod processing queue messages. The message should be gone from the storage queue at this point. Query the logs of the pod:

   ```bash
   $ KUBECONFIG=./kubeconfig.yaml kubectl logs queue-handler-c496dcfc-mb6tx
   ...
   C# Queue trigger function processed: Test Message
   Executed 'queue' (Succeeded, Id=ecd9433a-c6b7-468e-b6c6-6e7909bafce7)
   ...
   ```

5. At this point, you have a running cluster. Feel free to modify your program, and run `pulumi up` to redeploy changes.  The Pulumi CLI automatically detects what has changed and makes the minimal edits necessary to accomplish these changes. This could be altering the existing chart, adding new Azure or Kubernetes resources, or anything, really.

6. Once you are done, you can destroy all of the resources, and the stack:

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```
