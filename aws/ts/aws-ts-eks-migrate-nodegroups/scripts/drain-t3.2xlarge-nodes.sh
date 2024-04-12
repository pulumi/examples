#!/bin/bash

for node in $(kubectl get nodes -l beta.kubernetes.io/instance-type=t3.2xlarge -o=name); do
    echo "On node: $node"
    kubectl drain --force --ignore-daemonsets --delete-local-data --grace-period=10 "$node";
done
