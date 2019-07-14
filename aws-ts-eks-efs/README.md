The Amazon Elastic File System Container Storage Interface (CSI) Driver implements the [CSI specification](https://github.com/container-storage-interface/spec/blob/master/spec.md) for container orchestrators to manage the lifecycle of Amazon EFS filesystems. The CSI specification defines an interface along with the minimum operational and packaging recommendations for a storage provider to implement a CSI compatible plugin. The interface declares the RPCs that a plugin must expose. The CSI drivers are the right mechanism to work with, when using a cloud storage component with Kubernetes workloads. Amazon Elastic File System (Amazon EFS) provides parallel shared access through a standard file system interface to Amazon EC2 instances and Linux-based workloads without disrupting your applications. EFS is a regional service storing data across multiple Availability Zones (AZs) for high availability and durability. 

The [AWS EFS CSI Driver](https://github.com/kubernetes-sigs/aws-efs-csi-driver) is a Kubernetes [SIG-AWS](https://github.com/kubernetes/community/tree/master/sig-aws) subproject. The AWS EFS CSI Driver triggers the creation of out-of-tree CSI volume plugins in any Kubernetes cluster. Thereafter Kubernetes storage classes, persistent volumes and claims can be used by a Kubernetes workload to access the EFS CSI volume plugin as before.

In this blog, we will work through an example that shows how to use AWS EFS CSI storage components with Kubernetes workloads running on Amazon EKS worker nodes using Pulumi libraries ([EKS](https://github.com/pulumi/pulumi-eks), [AWS](https://github.com/pulumi/pulumi-aws), and [AWSX] (https://github.com/pulumi/pulumi-awsx/tree/master/nodejs/awsx)). These example steps are running on OS X.

## Step 1: Initialize Pulumi Project and Stack for your organization:
[Install Pulumi CLI](({{< ref "/docs/quickstart" >}})) and set up your [AWS credentials]()({{< ref "/docs/quickstart/aws" >}}). Initialize a new [Pulumi project](({{< ref "/docs/quickstart/project" >}})) from available templates. We use `aws-typescript` template here to install all library dependencies.

We will work with two Pulumi stacks in this example, one for the Amazon EKS cluster and AWS EFS CSI components caled k8sinfra. The other for the application and its storage class, persistent volume and persistent volume claim called app. The AWS EFS CSI (Container Storage Interface) is based on the initial [AWS EFS CSI Driver](https://github.com/kubernetes-sigs/aws-efs-csi-driver/) work done by Kubernetes [SIG-AWS](https://github.com/kubernetes/community/tree/master/sig-aws).

```bash
$ brew install pulumi # download Pulumi CLI

$ mkdir k8sinfra && cd k8sinfra

$ pulumi new aws-typescript

$ npm install --save @pulumi/kubernetes @pulumi/eks

$ ls -la
drwxr-xr-x   10 nishidavidson  staff    320 Jun 18 18:22 .
drwxr-xr-x+ 102 nishidavidson  staff   3264 Jun 18 18:13 ..
-rw-------    1 nishidavidson  staff     21 Jun 18 18:22 .gitignore
-rw-r--r--    1 nishidavidson  staff     32 Jun 18 18:22 Pulumi.dev.yaml
-rw-------    1 nishidavidson  staff     91 Jun 18 18:22 Pulumi.yaml
-rw-------    1 nishidavidson  staff    273 Jun 18 18:22 index.ts
drwxr-xr-x   95 nishidavidson  staff   3040 Jun 18 18:22 node_modules
-rw-r--r--    1 nishidavidson  staff  50650 Jun 18 18:22 package-lock.json
-rw-------    1 nishidavidson  staff    228 Jun 18 18:22 package.json
-rw-------    1 nishidavidson  staff    522 Jun 18 18:22 tsconfig.json
```

## Step 2: Create the EKS cluster, EFS endpoint and MountTargets:

The code below first declares an EKS cluster attached to two public subnets in a new VPC. We then declare EFS endpoint and mount the same to both subnets so the the EKS worker nodes can access the filesystem. This code should be pasted into `index.ts`.

```typescript
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";

//* STEP 1: Create an EKS cluster, an EFS endpoint and mount the EFS endpoint in each public subnet of the EKS cluster

// Create an EKS Cluster
const vpc = new awsx.Network("vpc", { usePrivateSubnets: false });
export const cluster = new eks.Cluster("eks-cluster", {
  vpcId             : vpc.vpcId,
  subnetIds         : vpc.publicSubnetIds,
  instanceType      : "t2.medium",
  version           : "1.12",
  nodeRootVolumeSize: 200,
  desiredCapacity   : 2,
  maxSize           : 3,
  minSize           : 2,
  deployDashboard   : true,
  vpcCniOptions     : {
    warmIpTarget    : 4,
  },
});

const nodeSecurityGroup = cluster.nodeSecurityGroup;
export const nodesubnetIds = cluster.core.subnetIds;
export const clusterName = cluster.eksCluster.name;
export const kubeconfig = cluster.kubeconfig.apply(JSON.stringify);

// Create an EFS endpoint 
export const efsFilesystem = new aws.efs.FileSystem("MyEFS", {
  tags: { Name: "myEFS" },
});

export const efsFilesystemId = efsFilesystem.id;

// Create a mounttarget in each of the EKS cluster VPC's AZs so that EC2 instances across the VPC can access the filesystem
new aws.efs.MountTarget("MyEFS-MountTarget1", {
  fileSystemId: efsFilesystemId,
  securityGroups: [ nodeSecurityGroup.id ],
  subnetId: nodesubnetIds[0],
});

new aws.efs.MountTarget("MyEFS-MountTarget2", {
  fileSystemId: efsFilesystemId,
  securityGroups: [ nodeSecurityGroup.id ],
  subnetId: nodesubnetIds[1],
});

```

## Step 3: Create the CSI Driver Node and Controller Components

Currently, only static provisioning for AWS EFS CSI drivers is supported by SIG-AWS, which implies the Amazon EFS filesystem needs to be manually created first. After that it can be mounted inside a container as a volume using the driver. The code below will allow you to deploy allow the CSI Driver components on the Amazon EKS cluster.

```typescript
//* STEP 3: Install EFS CSI Driver Node and Controller components

// Install EFS CSI Driver node components
const svcacntcsiNode = new k8s.core.v1.ServiceAccount ("csi-node-sa", {
  metadata: { name: "csi-node-sa", namespace: "kube-system"},
}, { provider: cluster.provider });

const clusterolecsiNode = new k8s.rbac.v1.ClusterRole("csi-node", {
  metadata: { name: "csi-node", namespace: "default"},
  rules: [
    { 
    apiGroups: [""],
    resources: ["secrets"],
    verbs: ["get", "list"],
  },
  { 
    apiGroups: [""],
    resources: ["nodes"],
    verbs: ["get", "list", "update"],
  },
  { 
    apiGroups: [""],
    resources: ["namespaces"],
    verbs: ["get", "list"],
  },  
  { 
    apiGroups: [""],
    resources: ["persistentvolumes"],
    verbs: ["get", "list", "watch", "update"],
  },
  { 
    apiGroups: ["storage.k8s.io"],
    resources: ["volumeattachments"],
    verbs: ["get", "list", "watch", "update"],
  },  
  { 
    apiGroups: ["csi.storage.k8s.io"],
    resources: ["csinodeinfos"],
    verbs: ["get", "list", "watch", "update"],
  },
 ],
}, { provider: cluster.provider });

const clusterolebindingcsiNode = new k8s.rbac.v1.ClusterRoleBinding("csi-node", {
  metadata: { name: "csi-node", namespace: "default" },
  subjects: [{ 
    kind: "ServiceAccount",
    name: "csi-node-sa", 
    namespace: "kube-system", 
  }],
  roleRef: { 
    kind: "ClusterRole", 
    name: "csi-node", 
    apiGroup: "rbac.authorization.k8s.io",
  },
}, { provider: cluster.provider });

const daemonsetcsiNode = new k8s.apps.v1beta2.DaemonSet("efs-csi-node", {
  metadata: { name: "efs-csi-node", namespace: "kube-system" },
  spec: {
    selector: { matchLabels: { app: "efs-csi-node" } },
    template: { 
      metadata: { labels: { app: "efs-csi-node" } },
      spec: {
          serviceAccount: "csi-node-sa",
          hostNetwork: true,
          containers: [
            {
                name: "efs-plugin",
                securityContext: { 
                  privileged: true, 
                },
                image: "amazon/aws-efs-csi-driver:latest",
                imagePullPolicy: "Always",
                args: [ "--endpoint=$(CSI_ENDPOINT)", "--logtostderr", "--v=5" ],
                env: [
                  { name: "CSI_ENDPOINT", value: "unix:/csi/csi.sock" }
                ],
                volumeMounts: [
                  { name: "kubelet-dir", mountPath: "/var/lib/kubelet", mountPropagation: "Bidirectional" },
                  { name: "plugin-dir", mountPath: "/csi" },
                  { name: "device-dir", mountPath: "/dev" }
                ],
            },
            {
                name: "csi-driver-registrar",
                image: "quay.io/k8scsi/driver-registrar:v0.4.2",
                imagePullPolicy: "Always",
                args: [ "--csi-address=$(ADDRESS)", "--mode=node-register", "--driver-requires-attachment=true", "--pod-info-mount-version=v1", "--kubelet-registration-path=$(DRIVER_REG_SOCK_PATH)", "--v=5" ],
                env: [
                  { name: "ADDRESS", value: "/csi/csi.sock" }, 
                  { name: "DRIVER_REG_SOCK_PATH", value: "/var/lib/kubelet/plugins/efs.csi.aws.com/csi.sock" }, 
                  { name: "KUBE_NODE_NAME", valueFrom: { fieldRef: { fieldPath : "spec.nodeName" } } },
                ],
                volumeMounts: [
                  { name: "plugin-dir", mountPath: "/csi" },
                  { name: "registration-dir", mountPath: "/registration" },
                ],
          },
          ],
          volumes: [ 
            { name: "kubelet-dir", hostPath: { path: "/var/lib/kubelet", type: "Directory" } },
            { name: "plugin-dir", hostPath: { path: "/var/lib/kubelet/plugins/efs.csi.aws.com/", type: "DirectoryOrCreate" } },
            { name: "registration-dir", hostPath: { path: "/var/lib/kubelet/plugins/", type: "Directory" } },
            { name: "device-dir", hostPath: { path: "/dev", type: "Directory" } }
          ],
      },
    },
  }, 
}, { provider: cluster.provider });

// Install EFS CSI Driver Controller components 
const svcacctcsiController = new k8s.core.v1.ServiceAccount ("csi-controller-sa", {
  metadata: { name: "csi-controller-sa", namespace: "kube-system"},
}, { provider: cluster.provider });

const clusterrolecsiController = new k8s.rbac.v1.ClusterRole("external-attacher-role", {
  metadata: { name: "external-attacher-role", namespace: "default"},
  rules: [
    { 
    apiGroups: [""],
    resources: ["persistentvolumes"],
    verbs: ["get", "list", "watch", "update"],
  },
  { 
    apiGroups: [""],
    resources: ["nodes"],
    verbs: ["get", "list", "watch"],
  },
  { 
    apiGroups: ["storage.k8s.io"],
    resources: ["volumeattachments"],
    verbs: ["get", "list","watch", "update"],
  },
 ],
}, { provider: cluster.provider });

const clusterrolebindingcsiController = new k8s.rbac.v1.ClusterRoleBinding("csi-attacher-role", {
  metadata: { name: "csi-attacher-role", namespace: "default" },
  subjects: [{ 
    kind: "ServiceAccount",
    name: "csi-controller-sa", 
    namespace: "kube-system", 
  }],
  roleRef: { 
    kind: "ClusterRole", 
    name: "external-attacher-role", 
    apiGroup: "rbac.authorization.k8s.io",
  },
}, { provider: cluster.provider });

const statefulsetcsiController = new k8s.apps.v1beta1.StatefulSet("efs-csi-controller", {
  metadata: { name: "efs-csi-controller", namespace: "kube-system" },
  spec: {
    serviceName: "efs-csi-controller",
    replicas: 1,
    template: { 
      metadata: { labels: { app: "efs-csi-controller" } },
      spec: {
        serviceAccount: "csi-controller-sa",
        priorityClassName: "system-cluster-critical",
        tolerations: [{ key: "CriticalAddonsOnly", operator: "Exists" }],
        containers: [
          {
              name: "efs-plugin",
              image: "amazon/aws-efs-csi-driver:latest",
              imagePullPolicy: "Always",
              args: [ "--endpoint=$(CSI_ENDPOINT)", "--logtostderr", "--v=5" ],
              env: [
                { name: "CSI_ENDPOINT", value: "unix:///var/lib/csi/sockets/pluginproxy/csi.sock" }
              ],
              volumeMounts: [
                { name: "socket-dir", mountPath: "/var/lib/csi/sockets/pluginproxy/"},
              ],
          },
          {
              name: "csi-attacher",
              image: "quay.io/k8scsi/csi-attacher:v0.4.2",
              imagePullPolicy: "Always",
              args: [ "--csi-address=$(ADDRESS)", "--v=5" ],
              env: [
                { name: "ADDRESS", value: "/var/lib/csi/sockets/pluginproxy/csi.sock" },
              ],
              volumeMounts: [
                { name: "socket-dir", mountPath: "/var/lib/csi/sockets/pluginproxy/"},
              ],
          },
        ],
        volumes: [ 
          { name: "socket-dir", emptyDir: { } },
        ],
      },
    },
  }, 
}, { provider: cluster.provider });

```

## Step 4: Deploy a sample app with the EFS volume mounts:

Once the step above is complete, you will be ready to deploy your k8s sample application, storage class, persistent volume and persistent volume claim. Lets create a new stack for this called k8sapp as follows:

```bash
$ mkdir k8sapp && cd k8sapp

$ pulumi new typescript

$ npm install --save @pulumi/eks @pulumi/kubernetes

```

Let's now declare the storage class, pv, pvc and application pod to complete our k8s application set-up for this example. We will update `index.ts` file again and run `pulumi up`:

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const env = pulumi.getStack();
const cluster = new pulumi.StackReference(`d-nishi/k8sinfra/${env}`);
const kubeconfig = cluster.getOutput("kubeconfig");
const efsFilesystemId = cluster.getOutput("efsFilesystemId");

const k8sProvider = new k8s.Provider("cluster", {
    kubeconfig: kubeconfig,
 });

//* STEP 5: Create a storage class, persistent volume and persistent volume claim

export const storageclassEFS = new k8s.storage.v1.StorageClass("efs-sc", {
    metadata: { name: "efs-sc" },
    provisioner: "efs.csi.aws.com"
  }, { provider: k8sProvider });
  
  const pvEFS = new k8s.core.v1.PersistentVolume("efs-pv", {
  metadata: { name: "efs-pv" },
  spec: { 
    capacity: { storage: "5Gi" },
    volumeMode: "Filesystem",
    accessModes: [ "ReadWriteOnce" ],
    persistentVolumeReclaimPolicy: "Recycle",
    storageClassName: "efs-sc",
    csi: { 
      driver: "efs.csi.aws.com", 
      volumeHandle: efsFilesystemId,
    }
  }
  }, { provider: k8sProvider });
  
  const pvcEFS = new k8s.core.v1.PersistentVolumeClaim("efs-claim", {
  metadata: { name: "efs-claim" },
  spec: { 
    accessModes: [ "ReadWriteOnce" ],
    storageClassName: "efs-sc",
    resources: { requests: { storage: "5Gi" } }
  }
  }, { provider: k8sProvider });

//* STEP 6: Mount the endpoint to pod in EKS cluster

export const newPod = new k8s.core.v1.Pod("efs-app", {
  metadata: { name: "efs-app" },
  spec: {
    containers: [{ 
      name: "app" , 
      image: "centos", 
      command: ["/bin/sh"],
      args: ["-c", "while true; do echo $(date -u) >> /data/out.txt; sleep 5; done"],
      volumeMounts: [{ 
        name: "persistent-storage", 
        mountPath: "/data",
      }],
    }],
    volumes: [{
      name: "persistent-storage",
      persistentVolumeClaim: { claimName: "efs-claim" }
    }],
  }
}, { provider: k8sProvider, dependsOn: pvcEFS });

```

Verify the pod is running and that data is being written into the EFS filesystem using:

```bash
$ kubectl exec -ti efs-app -- tail -f /data/out.txt
Mon Jul 8 06:12:00 UTC 2019
Mon Jul 8 06:12:05 UTC 2019
Mon Jul 8 06:12:10 UTC 2019
Mon Jul 8 06:12:15 UTC 2019

```

This brings us to the end of our solution with Pulumi and AWS EFS on Amazon EKS. For more examples, refer to Pulumi's open source repository [here](https://github.com/pulumi/examples) or refer to my other [Kubernetes articles](https://www.pulumi.com/blog/author/nishi-davidson/)
