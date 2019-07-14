import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";

//* STEP 1: Create an EKS Cluster, an EFS endpoint and mount the same to the public subnets of the EKS Cluster VPC

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

//* STEP 3: Install EFS CSI Driver node and controller components

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

// Install EFS CSI Driver controller components 

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