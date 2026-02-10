// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

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
    const _attachment = new aws.iam.RolePolicyAttachment(`system-node-policy-${index}`, {
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
    diskSize: 100,
    amiType: "AL2023_x86_64_NVIDIA",
    labels: {
        "node-role": "gpu",
        "nvidia.com/gpu.present": "true",
        "nvidia.com/mig.config": "all-balanced",
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

const ebsCsiPolicyAttachment = new aws.iam.RolePolicyAttachment("ebs-csi-policy-attachment", {
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
            strategy: "mixed",
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
// The NVIDIA DRA driver Helm chart creates mig.nvidia.com DeviceClass automatically
// when resources.gpus.enabled=true (see deviceclass-mig.yaml template)

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


// MIG Test Namespace
const migTestNamespace = new k8s.core.v1.Namespace("mig-test-ns", {
    metadata: { name: "mig-test" },
}, { provider: k8sProvider });

// ConfigMap with Fashion-MNIST training and inference scripts
const fashionMnistScripts = new k8s.core.v1.ConfigMap("fashion-mnist-scripts", {
    metadata: {
        name: "fashion-mnist-scripts",
        namespace: migTestNamespace.metadata.name,
    },
    data: {
        "large-training-script.py": `import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models

print("Starting Large Training Workload (3g.20gb MIG)")
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A'}")

transform = transforms.Compose([
    transforms.Resize(224),
    transforms.Grayscale(3),
    transforms.ToTensor(),
    transforms.Normalize((0.5,), (0.5,))
])

train_dataset = datasets.FashionMNIST('./data', train=True, download=True, transform=transform)
train_loader = torch.utils.data.DataLoader(train_dataset, batch_size=256, shuffle=True)

model = models.resnet18(pretrained=False, num_classes=10).cuda()
optimizer = optim.Adam(model.parameters(), lr=0.001)
criterion = nn.CrossEntropyLoss()

print("Starting training loop...")
for epoch in range(20):
    model.train()
    total_loss = 0
    correct = 0
    total = 0

    for batch_idx, (data, target) in enumerate(train_loader):
        data, target = data.cuda(), target.cuda()
        optimizer.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        pred = output.argmax(dim=1)
        correct += pred.eq(target).sum().item()
        total += target.size(0)

    accuracy = 100. * correct / total
    avg_loss = total_loss / len(train_loader)
    print(f"Epoch {epoch+1}/20 | Loss: {avg_loss:.4f} | Accuracy: {accuracy:.2f}% | GPU Mem: {torch.cuda.memory_allocated()/1e9:.2f}GB")

print("Training complete!")
`,
        "medium-training-script.py": `import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms

print("Starting Medium Training Workload (2g.10gb MIG)")
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A'}")

transform = transforms.Compose([
    transforms.Resize(32),
    transforms.ToTensor(),
    transforms.Normalize((0.5,), (0.5,))
])

train_dataset = datasets.FashionMNIST('./data', train=True, download=True, transform=transform)
train_loader = torch.utils.data.DataLoader(train_dataset, batch_size=128, shuffle=True)

# Custom CNN with 4 conv layers + 2 FC
model = nn.Sequential(
    nn.Conv2d(1, 64, kernel_size=3, padding=1),
    nn.ReLU(),
    nn.MaxPool2d(2),
    nn.Conv2d(64, 128, kernel_size=3, padding=1),
    nn.ReLU(),
    nn.MaxPool2d(2),
    nn.Conv2d(128, 256, kernel_size=3, padding=1),
    nn.ReLU(),
    nn.MaxPool2d(2),
    nn.Conv2d(256, 512, kernel_size=3, padding=1),
    nn.ReLU(),
    nn.AdaptiveAvgPool2d(1),
    nn.Flatten(),
    nn.Linear(512, 256),
    nn.ReLU(),
    nn.Dropout(0.5),
    nn.Linear(256, 10)
).cuda()

optimizer = optim.Adam(model.parameters(), lr=0.001)
criterion = nn.CrossEntropyLoss()

print("Starting training loop...")
for epoch in range(15):
    model.train()
    total_loss = 0
    correct = 0
    total = 0

    for batch_idx, (data, target) in enumerate(train_loader):
        data, target = data.cuda(), target.cuda()
        optimizer.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        pred = output.argmax(dim=1)
        correct += pred.eq(target).sum().item()
        total += target.size(0)

    accuracy = 100. * correct / total
    avg_loss = total_loss / len(train_loader)
    print(f"Epoch {epoch+1}/15 | Loss: {avg_loss:.4f} | Accuracy: {accuracy:.2f}% | GPU Mem: {torch.cuda.memory_allocated()/1e9:.2f}GB")

print("Training complete!")
`,
        "small-inference-script.py": `import torch
import torch.nn as nn
from torchvision import datasets, transforms

print("Starting Small Inference Workload (1g.5gb MIG)")
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A'}")

transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize((0.5,), (0.5,))
])

test_dataset = datasets.FashionMNIST('./data', train=False, download=True, transform=transform)
test_loader = torch.utils.data.DataLoader(test_dataset, batch_size=32, shuffle=False)

model = nn.Sequential(
    nn.Flatten(),
    nn.Linear(28*28, 512),
    nn.ReLU(),
    nn.Linear(512, 256),
    nn.ReLU(),
    nn.Linear(256, 10)
).cuda()

model.eval()

print("Starting continuous inference loop...")
iteration = 0
while True:
    for data, target in test_loader:
        data, target = data.cuda(), target.cuda()
        with torch.no_grad():
            output = model(data)
            pred = output.argmax(dim=1)

        if iteration % 50 == 0:
            print(f"Iteration {iteration} | GPU Mem: {torch.cuda.memory_allocated()/1e9:.2f}GB")

        iteration += 1
`,
    },
}, { provider: k8sProvider, dependsOn: [migTestNamespace] });

// ResourceClaimTemplate for 3g.20gb MIG profile (large training)
const migLargeClaimTemplate = new k8s.apiextensions.CustomResource("mig-large-template", {
    apiVersion: "resource.k8s.io/v1",
    kind: "ResourceClaimTemplate",
    metadata: {
        name: "mig-large-template",
        namespace: migTestNamespace.metadata.name,
    },
    spec: {
        spec: {
            devices: {
                requests: [{
                    name: "mig-large",
                    exactly: {
                        deviceClassName: "mig.nvidia.com",
                        count: 1,
                        selectors: [{
                            cel: {
                                expression: 'device.attributes["gpu.nvidia.com"].type == "mig" && device.attributes["gpu.nvidia.com"].profile == "3g.20gb"',
                            },
                        }],
                    },
                }],
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [draDriver] });

// ResourceClaimTemplate for 2g.10gb MIG profile (medium training)
const migMediumClaimTemplate = new k8s.apiextensions.CustomResource("mig-medium-template", {
    apiVersion: "resource.k8s.io/v1",
    kind: "ResourceClaimTemplate",
    metadata: {
        name: "mig-medium-template",
        namespace: migTestNamespace.metadata.name,
    },
    spec: {
        spec: {
            devices: {
                requests: [{
                    name: "mig-medium",
                    exactly: {
                        deviceClassName: "mig.nvidia.com",
                        count: 1,
                        selectors: [{
                            cel: {
                                expression: 'device.attributes["gpu.nvidia.com"].type == "mig" && device.attributes["gpu.nvidia.com"].profile == "2g.10gb"',
                            },
                        }],
                    },
                }],
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [draDriver] });

// ResourceClaimTemplate for 1g.5gb MIG profile (small inference)
const migSmallClaimTemplate = new k8s.apiextensions.CustomResource("mig-small-template", {
    apiVersion: "resource.k8s.io/v1",
    kind: "ResourceClaimTemplate",
    metadata: {
        name: "mig-small-template",
        namespace: migTestNamespace.metadata.name,
    },
    spec: {
        spec: {
            devices: {
                requests: [{
                    name: "mig-small",
                    exactly: {
                        deviceClassName: "mig.nvidia.com",
                        count: 1,
                        selectors: [{
                            cel: {
                                expression: 'device.attributes["gpu.nvidia.com"].type == "mig" && device.attributes["gpu.nvidia.com"].profile == "1g.5gb"',
                            },
                        }],
                    },
                }],
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [draDriver] });

// Pod for large training workload (3g.20gb MIG)
const migLargeTrainingPod = new k8s.core.v1.Pod("mig-large-training", {
    metadata: {
        name: "mig-large-training-pod",
        namespace: migTestNamespace.metadata.name,
    },
    spec: {
        restartPolicy: "Never",
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
            name: "training",
            image: "nvcr.io/nvidia/pytorch:25.12-py3",
            command: ["python", "/scripts/large-training-script.py"],
            volumeMounts: [{
                name: "scripts",
                mountPath: "/scripts",
                readOnly: true,
            }],
            resources: {
                claims: [{ name: "mig-large" }],
            },
        }],
        resourceClaims: [{
            name: "mig-large",
            resourceClaimTemplateName: "mig-large-template",
        }],
        volumes: [{
            name: "scripts",
            configMap: {
                name: fashionMnistScripts.metadata.name,
            },
        }],
    },
}, { provider: k8sProvider, dependsOn: [migLargeClaimTemplate, fashionMnistScripts] });

// Pod for medium training workload (2g.10gb MIG)
const migMediumTrainingPod = new k8s.core.v1.Pod("mig-medium-training", {
    metadata: {
        name: "mig-medium-training-pod",
        namespace: migTestNamespace.metadata.name,
    },
    spec: {
        restartPolicy: "Never",
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
            name: "training",
            image: "nvcr.io/nvidia/pytorch:25.12-py3",
            command: ["python", "/scripts/medium-training-script.py"],
            volumeMounts: [{
                name: "scripts",
                mountPath: "/scripts",
                readOnly: true,
            }],
            resources: {
                claims: [{ name: "mig-medium" }],
            },
        }],
        resourceClaims: [{
            name: "mig-medium",
            resourceClaimTemplateName: "mig-medium-template",
        }],
        volumes: [{
            name: "scripts",
            configMap: {
                name: fashionMnistScripts.metadata.name,
            },
        }],
    },
}, { provider: k8sProvider, dependsOn: [migMediumClaimTemplate, fashionMnistScripts] });

// Pod for small inference workload (1g.5gb MIG)
const migSmallInferencePod = new k8s.core.v1.Pod("mig-small-inference", {
    metadata: {
        name: "mig-small-inference-pod",
        namespace: migTestNamespace.metadata.name,
    },
    spec: {
        restartPolicy: "Never",
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
            name: "inference",
            image: "nvcr.io/nvidia/pytorch:25.12-py3",
            command: ["python", "/scripts/small-inference-script.py"],
            volumeMounts: [{
                name: "scripts",
                mountPath: "/scripts",
                readOnly: true,
            }],
            resources: {
                claims: [{ name: "mig-small" }],
            },
        }],
        resourceClaims: [{
            name: "mig-small",
            resourceClaimTemplateName: "mig-small-template",
        }],
        volumes: [{
            name: "scripts",
            configMap: {
                name: fashionMnistScripts.metadata.name,
            },
        }],
    },
}, { provider: k8sProvider, dependsOn: [migSmallClaimTemplate, fashionMnistScripts] });

/*
const migInvalidClaimTemplate = new k8s.apiextensions.CustomResource("mig-invalid-template", {
    apiVersion: "resource.k8s.io/v1",
    kind: "ResourceClaimTemplate",
    metadata: {
        name: "mig-invalid-template",
        namespace: migTestNamespace.metadata.name,
    },
    spec: {
        spec: {
            devices: {
                requests: [{
                    name: "invalid-mig",
                    exactly: {
                        deviceClassName: "mig.nvidia.com",
                        count: 1,
                        selectors: [{
                            cel: {
                                expression: 'device.attributes["gpu.nvidia.com"].type == "mig" && device.attributes["gpu.nvidia.com"].profile == "7g.40gb"',
                            },
                        }],
                    },
                }],
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [draDriver] });


const migInvalidInferencePod = new k8s.core.v1.Pod("mig-invalid-inference", {
    metadata: {
        name: "mig-invalid-inference-pod",
        namespace: migTestNamespace.metadata.name,
    },
    spec: {
        restartPolicy: "Never",
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
            name: "inference",
            image: "nvcr.io/nvidia/pytorch:25.12-py3",
            command: ["python", "/scripts/small-inference-script.py"],
            volumeMounts: [{
                name: "scripts",
                mountPath: "/scripts",
                readOnly: true,
            }],
            resources: {
                claims: [{ name: "invalid-mig" }],
            },
        }],
        resourceClaims: [{
            name: "invalid-mig",
            resourceClaimTemplateName: "mig-invalid-template",
        }],
        volumes: [{
            name: "scripts",
            configMap: {
                name: fashionMnistScripts.metadata.name,
            },
        }],
    },
}, { provider: k8sProvider, dependsOn: [migInvalidClaimTemplate, fashionMnistScripts] });
*/

// Export outputs
export const kubeconfig = pulumi.secret(cluster.kubeconfig);
export const clusterNameOutput = cluster.eksCluster.name;
export const grafanaPassword = "gpu-monitoring-demo";
export const vpcId = vpc.vpcId;
export const privateSubnetIds = vpc.privateSubnetIds;
export const publicSubnetIds = vpc.publicSubnetIds;
