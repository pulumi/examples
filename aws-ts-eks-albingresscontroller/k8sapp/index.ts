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