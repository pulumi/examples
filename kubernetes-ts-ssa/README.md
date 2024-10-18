[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/kubernetes-ts-ssa/README.md)

# Kubernetes SSA (Multi-Party Authoring)

An example of using Kubernetes Server-Side Apply (SSA) to manage a deployment using
Pulumi and `@pulumi/kubernetes`.  This example highlights the separation-of-concerns aspect of SSA,
by splitting the management of an nginx deployment across two apps (`deploy` and `scale`).

The `deploy` app is concerned with deploying and servicing the nginx server. It sets an initial value
for `spec.replicas` and then ignores any changes to the field.

The `scale` app is concerned with scaling the nginx server. It uses Pulumi's support for SSA to manage
the replicas field of the deployment.

## Deploying the App

Follow the steps in [Pulumi Installation and Setup](https://www.pulumi.com/docs/get-started/install/) and [Configuring Pulumi
Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/) to get setup with Pulumi and Kubernetes.

Change to the `deploy` directory:

```sh
cd deploy/
```

Install dependencies:

```sh
cd deploy/
npm install
```

Create a new stack:

```sh
$ pulumi stack init
Enter a stack name: testing
```

Perform the deployment, and take note of the outputted name of the deployment (e.g. `nginx-a3e12ea6`):

```sh
$ pulumi up
Updating (testing)

     Type                              Name                              Status           
 +   pulumi:pulumi:Stack               kubernetes-ts-ssa-deploy-testing  created (3s)     
 +   └─ kubernetes:apps/v1:Deployment  nginx                             created (2s)     

Outputs:
    name: "nginx-a3e12ea6"

Resources:
    + 2 created

Duration: 5s
```

The application is now deployed. Use `kubectl` to see the deployment, and observe that replicas is `1`:

```sh
$ k get deployment 
NAME             READY   UP-TO-DATE   AVAILABLE   AGE
nginx-a3e12ea6   1/1     1            1           79s
```

## Scaling the App

Change to the `scale` directory:

```sh
cd scale/
```

Install dependencies:

```sh
cd scale/
npm install
```

Create a new stack:

```sh
$ pulumi stack init
Enter a stack name: testing
```

Configure the name of the deployment to be scaled by the app:

```sh
$ pulumi config set name nginx-a3e12ea6
```

Scale the deployment:

```sh
$ pulumi up
Updating (testing)

     Type                                   Name                             Status              
 +   pulumi:pulumi:Stack                    kubernetes-ts-ssa-scale-testing  created (0.28s)     
 +   └─ kubernetes:apps/v1:DeploymentPatch  nginx                            created (0.13s)     


Resources:
    + 2 created

Duration: 2s
```

Use `kubectl` to see the updated deployment, and observe that replicas is `3`:

```sh
$ k get deployment
NAME             READY   UP-TO-DATE   AVAILABLE   AGE
nginx-a3e12ea6   3/3     3            3           11m
```

## Observing the Managed Fields
The Kubernetes API tracks field ownership using object metadata (`managedFields`). Observe that the deployment
now has three field managers, representing the deploy and scale applications that are managing the spec,
and the Kubernetes controller that is managing the status.

```sh
$ k get deployment nginx-a3e12ea6 --show-managed-fields -oyaml
NAME             READY   UP-TO-DATE   AVAILABLE   AGE
nginx-a3e12ea6   3/3     3            3           11m
```

The results should resemble:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    deployment.kubernetes.io/revision: "1"
    pulumi.com/autonamed: "true"
    pulumi.com/patchFieldManager: kubernetes-ts-ssa-deploy
    pulumi.com/patchForce: "true"
  creationTimestamp: "2023-09-07T00:18:03Z"
  generation: 2
  managedFields:
  - apiVersion: apps/v1
    fieldsType: FieldsV1
    fieldsV1:
      f:metadata:
        f:annotations:
          f:pulumi.com/autonamed: {}
          f:pulumi.com/patchFieldManager: {}
      f:spec:
        f:selector: {}
        f:template:
          f:metadata:
            f:labels:
              f:app: {}
          f:spec:
            f:containers:
              k:{"name":"nginx"}:
                .: {}
                f:image: {}
                f:name: {}
    manager: kubernetes-ts-ssa-deploy
    operation: Apply
    time: "2023-09-07T00:18:03Z"
  - apiVersion: apps/v1
    fieldsType: FieldsV1
    fieldsV1:
      f:metadata:
        f:annotations:
          f:pulumi.com/patchForce: {}
      f:spec:
        f:replicas: {}
    manager: pulumi-kubernetes-31df3088
    operation: Apply
    time: "2023-09-07T00:33:54Z"
  - apiVersion: apps/v1
    fieldsType: FieldsV1
    fieldsV1:
      f:metadata:
        f:annotations:
          f:deployment.kubernetes.io/revision: {}
      f:status:
        f:availableReplicas: {}
        f:conditions:
          .: {}
          k:{"type":"Available"}:
            .: {}
            f:lastTransitionTime: {}
            f:lastUpdateTime: {}
            f:message: {}
            f:reason: {}
            f:status: {}
            f:type: {}
          k:{"type":"Progressing"}:
            .: {}
            f:lastTransitionTime: {}
            f:lastUpdateTime: {}
            f:message: {}
            f:reason: {}
            f:status: {}
            f:type: {}
        f:observedGeneration: {}
        f:readyReplicas: {}
        f:replicas: {}
        f:updatedReplicas: {}
    manager: kube-controller-manager
    operation: Update
    subresource: status
    time: "2023-09-07T00:33:57Z"
  name: nginx-a3e12ea6
  namespace: default
  resourceVersion: "72206"
  uid: 131954f7-83d1-4129-a956-e797dce2dfdd
spec:
  progressDeadlineSeconds: 600
  replicas: 3
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app: nginx
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx
        imagePullPolicy: Always
        name: nginx
        resources: {}
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30
```

## Cleanup

Destroy the scale app:

```sh
$ cd scale/
$ pulumi destroy -f
```

Observe that the deployment was not deleted, and that replicas has reverted to the default value:

```sh
$ k get deployment 
NAME             READY   UP-TO-DATE   AVAILABLE   AGE
nginx-a3e12ea6   1/1     1            1           14m
```

Destroy the deploy app:

```sh
$ cd deploy/
$ pulumi destroy -f
```
