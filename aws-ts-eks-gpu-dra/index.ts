import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";

const config = new pulumi.Config();
const clusterName = config.get("clusterName") || "gpu-dra-cluster";

// VPC with required EKS subnet tags
const vpc = new awsx.ec2.Vpc("gpu-vpc", {
    enableDnsHostnames: true,
    cidrBlock: "10.0.0.0/16",
    subnetSpecs: [
        {
            type: awsx.ec2.SubnetType.Public,
            tags: {
                [`kubernetes.io/cluster/${clusterName}`]: "shared",
                "kubernetes.io/role/elb": "1",
            },
        },
        {
            type: awsx.ec2.SubnetType.Private,
            tags: {
                [`kubernetes.io/cluster/${clusterName}`]: "shared",
                "kubernetes.io/role/internal-elb": "1",
            },
        },
    ],
    subnetStrategy: "Auto",
});

// EKS cluster without Auto Mode
// We'll use a managed node group for system workloads and a GPU node group for GPU workloads
const cluster = new eks.Cluster("gpu-cluster", {
    name: clusterName,
    vpcId: vpc.vpcId,
    publicSubnetIds: vpc.publicSubnetIds,
    privateSubnetIds: vpc.privateSubnetIds,
    authenticationMode: eks.AuthenticationMode.Api,
    skipDefaultNodeGroup: true,
    version: "1.34",
});

// IAM role for managed node group
const nodeRole = new aws.iam.Role("system-node-role", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
                Service: "ec2.amazonaws.com",
            },
        }],
    }),
});

// Attach required policies for EKS worker nodes
const nodeRolePolicies = [
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
];

nodeRolePolicies.forEach((policyArn, index) => {
    new aws.iam.RolePolicyAttachment(`system-node-policy-${index}`, {
        role: nodeRole.name,
        policyArn: policyArn,
    });
});

// System Node Group - m6i.large for system workloads
const systemNodeGroup = new eks.ManagedNodeGroup("system-nodes", {
    cluster: cluster,
    nodeGroupName: "system-nodes",
    nodeRole: nodeRole,
    instanceTypes: ["m6i.large"],
    capacityType: "ON_DEMAND",
    scalingConfig: {
        desiredSize: 2,
        minSize: 1,
        maxSize: 4,
    },
    labels: {
        "node-role": "system",
    },
    taints: [],
}, { dependsOn: [cluster] });


// GPU Node Group - p4d.24xlarge for A100 40GB GPUs with MIG support
// A100 supports MIG with profiles: 1g.5gb, 2g.10gb, 3g.20gb, 4g.40gb, 7g.40gb
// Note: A10G (g5.12xlarge) does NOT support MIG despite being Ampere architecture
// Using ON_DEMAND due to SPOT UnfulfillableCapacity errors
const gpuNodeGroup = new eks.ManagedNodeGroup("gpu-nodes", {
    cluster: cluster,
    nodeGroupName: "gpu-nodes",
    nodeRole: nodeRole,
    instanceTypes: ["p4d.24xlarge"],
    capacityType: "ON_DEMAND",
    scalingConfig: {
        desiredSize: 1,
        minSize: 0,
        maxSize: 2,
    },
    amiType: "AL2023_x86_64_NVIDIA",
    labels: {
        "node-role": "gpu",
        "nvidia.com/gpu.present": "true",
        "nvidia.com/mig.config": "all-1g.5gb",
    },
    taints: [{
        key: "nvidia.com/gpu",
        value: "true",
        effect: "NO_SCHEDULE",
    }],
}, { dependsOn: [cluster] });

// CoreDNS - Cluster DNS (latest for EKS 1.34)
const coreDnsAddon = new aws.eks.Addon("coredns", {
    clusterName: cluster.eksCluster.name,
    addonName: "coredns",
    addonVersion: "v1.13.1-eksbuild.1",
    resolveConflictsOnCreate: "OVERWRITE",
    resolveConflictsOnUpdate: "OVERWRITE",
}, { dependsOn: [systemNodeGroup] });

// EKS Pod Identity Agent - For IRSA replacement (modern pod identity)
const podIdentityAddon = new aws.eks.Addon("eks-pod-identity-agent", {
    clusterName: cluster.eksCluster.name,
    addonName: "eks-pod-identity-agent",
    addonVersion: "v1.3.10-eksbuild.2",
    resolveConflictsOnCreate: "OVERWRITE",
    resolveConflictsOnUpdate: "OVERWRITE",
}, { dependsOn: [systemNodeGroup] });

// EBS CSI Driver - Required for persistent volumes with EBS
// Creates IAM role with Pod Identity for the ebs-csi-controller-sa service account
const ebsCsiRole = new aws.iam.Role("ebs-csi-role", {
    name: pulumi.interpolate`AmazonEKS_EBS_CSI_DriverRole-${clusterName}`,
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Principal: {
                Service: "pods.eks.amazonaws.com",
            },
            Action: [
                "sts:AssumeRole",
                "sts:TagSession",
            ],
        }],
    }),
});

new aws.iam.RolePolicyAttachment("ebs-csi-policy-attachment", {
    role: ebsCsiRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy",
});

const ebsCsiPodIdentity = new aws.eks.PodIdentityAssociation("ebs-csi-pod-identity", {
    clusterName: cluster.eksCluster.name,
    namespace: "kube-system",
    serviceAccount: "ebs-csi-controller-sa",
    roleArn: ebsCsiRole.arn,
}, { dependsOn: [podIdentityAddon] });

const ebsCsiAddon = new aws.eks.Addon("aws-ebs-csi-driver", {
    clusterName: cluster.eksCluster.name,
    addonName: "aws-ebs-csi-driver",
    addonVersion: "v1.54.0-eksbuild.1",
    resolveConflictsOnCreate: "OVERWRITE",
    resolveConflictsOnUpdate: "OVERWRITE",
}, { dependsOn: [systemNodeGroup, ebsCsiPodIdentity] });

// Kubernetes provider for deploying resources
const k8sProvider = new k8s.Provider("k8s-provider", {
    kubeconfig: cluster.kubeconfigJson,
    enableServerSideApply: true,
});

// Default gp3 StorageClass for EBS volumes
// This is a general-purpose storage class used by all workloads requiring persistent storage
const gp3StorageClass = new k8s.storage.v1.StorageClass("gp3-storage-class", {
    metadata: {
        name: "gp3",
        annotations: {
            "storageclass.kubernetes.io/is-default-class": "true",
        },
    },
    provisioner: "ebs.csi.aws.com",
    volumeBindingMode: "WaitForFirstConsumer",
    reclaimPolicy: "Delete",
    allowVolumeExpansion: true,
    parameters: {
        type: "gp3",
        encrypted: "true",
    },
}, { provider: k8sProvider, dependsOn: [ebsCsiAddon] });

// NVIDIA GPU Operator with DRA configuration
const gpuOperatorNamespace = new k8s.core.v1.Namespace("gpu-operator-ns", {
    metadata: { name: "gpu-operator" },
}, { provider: k8sProvider });

const gpuOperator = new k8s.helm.v3.Release("gpu-operator", {
    chart: "gpu-operator",
    namespace: gpuOperatorNamespace.metadata.name,
    repositoryOpts: {
        repo: "https://helm.ngc.nvidia.com/nvidia",
    },
    version: "v25.10.1",
    skipAwait: true,
    values: {
        driver: { enabled: false },
        toolkit: { enabled: false },
        devicePlugin: { enabled: false },
        operator: {
            defaultRuntime: "containerd",
        },
        nfd: { enabled: true },
        mig: {
            strategy: "single",
        },
        migManager: {
            enabled: true,
            env: [{
                name: "WITH_REBOOT",
                value: "true",
            }],
        },
        dcgmExporter: {
            enabled: true,
            serviceMonitor: { enabled: true },
        },
    },
}, { provider: k8sProvider, dependsOn: [gpuNodeGroup] });

// NVIDIA DRA Driver for GPU allocation
// Note: MIG configuration label (nvidia.com/mig.config=all-1g.5gb) is already
// applied via the GPU node group labels, so MIG Manager will automatically
// detect and configure MIG on the GPU nodes
const draDriverNamespace = new k8s.core.v1.Namespace("dra-driver-ns", {
    metadata: { name: "nvidia-dra-driver" },
}, { provider: k8sProvider });

const draDriver = new k8s.helm.v3.Release("nvidia-dra-driver", {
    chart: "nvidia-dra-driver-gpu",
    namespace: draDriverNamespace.metadata.name,
    repositoryOpts: {
        repo: "https://helm.ngc.nvidia.com/nvidia",
    },
    version: "v25.8.1",
    skipAwait: true,
    values: {
        nvidiaDriverRoot: "/",
        gpuResourcesEnabledOverride: true,
        resources: {
            gpus: { enabled: true },
            computeDomains: { enabled: false },
        },
        kubeletPlugin: {
            tolerations: [{
                key: "nvidia.com/gpu",
                operator: "Exists",
                effect: "NoSchedule",
            }],
        },
        controller: {
            affinity: {
                nodeAffinity: {
                    requiredDuringSchedulingIgnoredDuringExecution: {
                        nodeSelectorTerms: [{
                            matchExpressions: [{
                                key: "node-role",
                                operator: "In",
                                values: ["system"],
                            }],
                        }],
                    },
                },
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [gpuOperator] });

// DeviceClass for MIG-enabled GPUs
// NOTE: When resources.gpus.enabled=true, the NVIDIA DRA driver Helm chart creates this DeviceClass automatically
// const migDeviceClass = new k8s.apiextensions.CustomResource("mig-device-class", {
//     apiVersion: "resource.k8s.io/v1",
//     kind: "DeviceClass",
//     metadata: { name: "mig.nvidia.com" },
//     spec: {
//         selectors: [{
//             cel: { expression: 'device.driver == "gpu.nvidia.com"' },
//         }],
//     },
// }, { provider: k8sProvider, dependsOn: [draDriver] });

// Monitoring namespace
const monitoringNamespace = new k8s.core.v1.Namespace("monitoring-ns", {
    metadata: { name: "monitoring" },
}, { provider: k8sProvider });

// Prometheus stack for GPU metrics visualization
const prometheusStack = new k8s.helm.v3.Release("kube-prometheus-stack", {
    chart: "kube-prometheus-stack",
    namespace: monitoringNamespace.metadata.name,
    repositoryOpts: {
        repo: "https://prometheus-community.github.io/helm-charts",
    },
    version: "81.2.1",
    skipAwait: true,
    values: {
        prometheus: {
            prometheusSpec: {
                serviceMonitorSelectorNilUsesHelmValues: false,
                podMonitorSelectorNilUsesHelmValues: false,
                resources: {
                    requests: { cpu: "500m", memory: "1Gi" },
                    limits: { cpu: "1000m", memory: "2Gi" },
                },
            },
        },
        grafana: {
            enabled: true,
            adminPassword: "gpu-monitoring-demo",
            service: { type: "LoadBalancer" },
            dashboardProviders: {
                "dashboardproviders.yaml": {
                    apiVersion: 1,
                    providers: [{
                        name: "default",
                        orgId: 1,
                        folder: "",
                        type: "file",
                        disableDeletion: false,
                        editable: true,
                        options: { path: "/var/lib/grafana/dashboards/default" },
                    }],
                },
            },
            dashboards: {
                default: {
                    "nvidia-dcgm-mig": {
                        gnetId: 16640,
                        revision: 1,
                        datasource: "Prometheus",
                    },
                },
            },
        },
        alertmanager: { enabled: false },
    },
}, { provider: k8sProvider, dependsOn: [gpuOperator, gp3StorageClass] });

// Namespace for inference workloads
const inferenceNamespace = new k8s.core.v1.Namespace("ml-inference", {
    metadata: { name: "ml-inference" },
}, { provider: k8sProvider });

// ResourceClaimTemplate for 1g.5gb MIG profile (A100 GPUs)
const migClaimTemplate = new k8s.apiextensions.CustomResource("inference-mig-template", {
    apiVersion: "resource.k8s.io/v1",
    kind: "ResourceClaimTemplate",
    metadata: {
        name: "inference-mig-1g5gb",
        namespace: inferenceNamespace.metadata.name,
    },
    spec: {
        spec: {
            devices: {
                requests: [{
                    name: "mig-gpu",
                    exactly: {
                        deviceClassName: "mig.nvidia.com",
                        count: 1,
                        selectors: [{
                            cel: {
                                expression: 'device.attributes["gpu.nvidia.com"].profile == "1g.5gb"',
                            },
                        }],
                    },
                }],
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [draDriver] });

// MIG Test Namespace
const migTestNamespace = new k8s.core.v1.Namespace("mig-test-ns", {
    metadata: { name: "mig-test" },
}, { provider: k8sProvider });

// ResourceClaimTemplate for MIG 1g.5gb profile (test workloads)
const migTestClaimTemplate = new k8s.apiextensions.CustomResource("mig-test-claim-template", {
    apiVersion: "resource.k8s.io/v1",
    kind: "ResourceClaimTemplate",
    metadata: {
        name: "mig-1g5gb-template",
        namespace: migTestNamespace.metadata.name,
    },
    spec: {
        spec: {
            devices: {
                requests: [{
                    name: "mig-gpu",
                    exactly: {
                        deviceClassName: "mig.nvidia.com",
                        count: 1,
                        selectors: [{
                            cel: {
                                expression: 'device.attributes["gpu.nvidia.com"].profile == "1g.5gb"',
                            },
                        }],
                    },
                }],
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [draDriver] });

// ResourceClaimTemplate for LARGE MIG profile (7g.40gb) - THIS SHOULD BE BLOCKED BY POLICY
// This demonstrates a policy violation: using the full GPU defeats the purpose of MIG
const migLargeClaimTemplate = new k8s.apiextensions.CustomResource("mig-large-claim-template", {
    apiVersion: "resource.k8s.io/v1",
    kind: "ResourceClaimTemplate",
    metadata: {
        name: "mig-7g40gb-template",
        namespace: migTestNamespace.metadata.name,
    },
    spec: {
        spec: {
            devices: {
                requests: [{
                    name: "mig-gpu",
                    exactly: {
                        deviceClassName: "mig.nvidia.com",
                        count: 1,
                        selectors: [{
                            cel: {
                                expression: 'device.attributes["gpu.nvidia.com"].profile == "7g.40gb"',
                            },
                        }],
                    },
                }],
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [draDriver] });

// MIG Inference Test Deployment
const migInferenceDeployment = new k8s.apps.v1.Deployment("mig-inference-test", {
    metadata: {
        name: "mig-inference-test",
        namespace: migTestNamespace.metadata.name,
    },
    spec: {
        replicas: 2,
        selector: {
            matchLabels: { app: "mig-inference-test" },
        },
        template: {
            metadata: {
                labels: { app: "mig-inference-test" },
            },
            spec: {
                tolerations: [{
                    key: "nvidia.com/gpu",
                    operator: "Exists",
                    effect: "NoSchedule",
                }],
                nodeSelector: {
                    "node-role": "gpu",
                    "nvidia.com/gpu.present": "true",
                },
                containers: [{
                    name: "cuda-test",
                    image: "nvidia/cuda:13.1.1-base-ubuntu24.04",
                    command: ["sh", "-c", "while true; do nvidia-smi; sleep 30; done"],
                    resources: {
                        claims: [{ name: "mig-gpu" }],
                    },
                }],
                resourceClaims: [{
                    name: "mig-gpu",
                    resourceClaimTemplateName: "mig-1g5gb-template",
                }],
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [migTestClaimTemplate, gpuNodeGroup] });

// Export outputs
export const kubeconfig = pulumi.secret(cluster.kubeconfig);
export const clusterNameOutput = cluster.eksCluster.name;
export const grafanaPassword = "gpu-monitoring-demo";
export const vpcId = vpc.vpcId;
export const privateSubnetIds = vpc.privateSubnetIds;
export const publicSubnetIds = vpc.publicSubnetIds;
