# EKS GPU Dynamic Resource Allocation (DRA) Demo

A Pulumi program that provisions an Amazon EKS 1.34 cluster with NVIDIA GPU support using Dynamic Resource Allocation (DRA) and Multi-Instance GPU (MIG) technology.

## Overview

This project demonstrates:

1. EKS 1.34 cluster with GPU nodes (p4d.24xlarge with A100 40GB GPUs)
1. NVIDIA GPU Operator with MIG Manager
1. NVIDIA DRA driver for GPU resource allocation
1. MIG configuration with multiple profile sizes (1g.5gb, 2g.10gb, 3g.20gb)
1. Fashion-MNIST workloads demonstrating concurrent GPU sharing
1. Prometheus + Grafana monitoring with DCGM dashboards

## Prerequisites

1. Pulumi CLI (>= v3): https://www.pulumi.com/docs/get-started/install/
1. Node.js (>= 14): https://nodejs.org/
1. AWS credentials configured with permissions to create EKS clusters
1. Pulumi ESC environment configured for authentication (pulumi-idp/auth)

## Architecture

### Cluster Configuration

1. **System Node Group**: m6i.large instances for system workloads
1. **GPU Node Group**: p4d.24xlarge instances (8× A100 40GB GPUs) with MIG enabled
1. **MIG Configuration**: `all-balanced` profile creates:
   - 2× 1g.5gb slices
   - 1× 2g.10gb slice
   - 1× 3g.20gb slice
   - Per GPU (total 8 GPUs)

### Fashion-MNIST Workloads

Three concurrent workloads demonstrate MIG GPU sharing:

1. **Large Training (3g.20gb)**: ResNet-18 training with batch size 256, ~15GB memory
1. **Medium Training (2g.10gb)**: Custom CNN training with batch size 128, ~8GB memory
1. **Small Inference (1g.5gb)**: Simple MLP inference with batch size 32, ~3GB memory

All workloads run simultaneously on the same physical GPU using different MIG slices.

## Getting Started

### Deploy Infrastructure

1. Install dependencies:

   ```bash
   npm install
   ```

1. Preview and deploy:

   ```bash
   pulumi preview
   pulumi up
   ```

1. Wait for GPU nodes to provision and MIG Manager to configure GPUs

### Verify MIG Configuration

1. Check GPU node status:

   ```bash
   pulumi env run pulumi-idp/auth -- kubectl get nodes -l node-role=gpu
   ```

1. Verify MIG configuration:

   ```bash
   pulumi env run pulumi-idp/auth -- kubectl get node <gpu-node-name> -o yaml | grep mig
   ```

### Monitor Fashion-MNIST Workloads

1. Check pod status:

   ```bash
   pulumi env run pulumi-idp/auth -- kubectl get pods -n mig-test -w
   ```

1. View large training logs:

   ```bash
   pulumi env run pulumi-idp/auth -- kubectl logs -f mig-large-training-pod -n mig-test
   ```

1. View medium training logs:

   ```bash
   pulumi env run pulumi-idp/auth -- kubectl logs -f mig-medium-training-pod -n mig-test
   ```

1. View small inference logs:

   ```bash
   pulumi env run pulumi-idp/auth -- kubectl logs -f mig-small-inference-pod -n mig-test
   ```

1. Verify all pods are on the same GPU:

   ```bash
   pulumi env run pulumi-idp/auth -- kubectl exec mig-large-training-pod -n mig-test -- nvidia-smi
   ```

### Access Grafana Dashboard

1. Get Grafana LoadBalancer URL:

   ```bash
   pulumi env run pulumi-idp/auth -- kubectl get svc -n monitoring kube-prometheus-stack-grafana
   ```

1. Access Grafana at the LoadBalancer URL
   - Username: `admin`
   - Password: `gpu-monitoring-demo`

1. Navigate to the "NVIDIA DCGM MIG" dashboard to view GPU metrics

### Expected Results

1. All three pods should reach Running state
1. Training pods should show increasing accuracy over epochs
1. Inference pod should show continuous throughput
1. Grafana should display 60-90% GPU utilization across MIG slices
1. All workloads should be sharing the same physical GPU
1. No OOM errors or pod evictions

## Project Layout

1. `index.ts` — Main Pulumi program
1. `mig-policy/` — Pulumi Policy Pack for MIG profile enforcement
1. `package.json` — Node.js dependencies
1. `tsconfig.json` — TypeScript compiler options
1. `Pulumi.yaml` — Pulumi project metadata

## Configuration

| Key           | Description                      | Default            |
| ------------- | -------------------------------- | ------------------ |
| `clusterName` | Name for the EKS cluster         | `gpu-dra-cluster`  |
| `aws:region`  | AWS region to deploy resources   | Set in stack config|

## Cleanup

To destroy all resources:

```bash
pulumi destroy
pulumi stack rm
```

**Note**: GPU instances are expensive. Destroy resources when not in use.

## Troubleshooting

### Pods Stuck in Pending

1. Check GPU node status and MIG configuration
1. Verify DRA driver is running: `kubectl get pods -n nvidia-dra-driver`
1. Check GPU Operator status: `kubectl get pods -n gpu-operator`

### MIG Configuration Not Applied

1. Check MIG Manager logs: `kubectl logs -n gpu-operator -l app=nvidia-mig-manager`
1. Verify node labels: `kubectl get nodes -l nvidia.com/mig.config=all-balanced`
1. May require node reboot (MIG Manager sets `WITH_REBOOT=true`)

### Fashion-MNIST Downloads Failing

1. Pods require internet access to download Fashion-MNIST dataset
1. Verify NAT Gateway is configured for private subnets
1. Check pod logs for download errors

## Additional Resources

1. [NVIDIA MIG User Guide](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/)
1. [Kubernetes Dynamic Resource Allocation](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/)
1. [NVIDIA GPU Operator Documentation](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/index.html)
