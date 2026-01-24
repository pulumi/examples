# Amazon EKS with Dynamic Resource Allocation (DRA) and NVIDIA MIG

This example demonstrates how to deploy an Amazon EKS cluster with Kubernetes Dynamic Resource Allocation (DRA) and NVIDIA Multi-Instance GPU (MIG) support for efficient GPU sharing.

## Overview

The example creates:

- A VPC with public and private subnets
- An EKS cluster (v1.34+) with DRA support
- System node group for cluster workloads
- GPU node group with p4d.24xlarge instances (A100 GPUs)
- NVIDIA GPU Operator with MIG configuration
- NVIDIA DRA Driver for GPU resource allocation
- Sample inference deployment using MIG partitions

## Prerequisites

- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- [Node.js](https://nodejs.org/) (>= 18)
- AWS credentials configured
- Access to p4d.24xlarge instances (requires capacity in your region)

## Deploying

1. Install dependencies:

    ```bash
    npm install
    ```

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Set your AWS region:

    ```bash
    pulumi config set aws:region us-east-1
    ```

1. Deploy the infrastructure:

    ```bash
    pulumi up
    ```

1. Get the kubeconfig:

    ```bash
    pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml
    export KUBECONFIG=$PWD/kubeconfig.yaml
    ```

## MIG Policy Pack

The `mig-policy/` directory contains a CrossGuard policy pack that enforces small MIG profiles to maximize GPU utilization:

```bash
cd mig-policy
npm install
cd ..
pulumi preview --policy-pack ./mig-policy
```

## Cleaning Up

```bash
pulumi destroy
pulumi stack rm dev
```

## Learn More

- [Blog post: Dynamic Resource Allocation with MIG on Amazon EKS](https://www.pulumi.com/blog/pulumi-eks-dynamic-resource-allocation/)
- [Kubernetes DRA documentation](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/)
- [NVIDIA MIG User Guide](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/)
- [NVIDIA GPU Operator](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/)
