#!/bin/bash

for node in $(kubectl get nodes -l beta.kubernetes.io/instance-type=t3.2xlarge -o=name); do
    echo "On node: $node"
    kubectl delete "$node";
done
