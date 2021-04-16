#!/bin/bash

set -ex

export KUBECONFIG=$(mktemp)
pulumi stack output kubeconfig --show-secrets > $KUBECONFIG

DEPLOYMENT=$(pulumi stack output appName)
if [ -z "$DEPLOYMENT" ]; then
    2> echo "error: missing Kubernetes Deployment name"
    exit 1
fi

export DB_HOST=$(pulumi stack output dbAddress)
export DB_USERNAME=$(pulumi config get dbUsername)
export DB_PASSWORD=$(pulumi config get dbPassword)
if [ -z "$DB_HOST" ] || [ -z "$DB_USERNAME" ] || [ -z "$DB_PASSWORD" ]; then
    2> echo "error: missing DB_* information"
    exit 2
fi

# Get the Pod name so we can properly exec onto it.
kubectl get po -o "custom-columns=:metadata.name"
POD=$(kubectl get po -o "custom-columns=:metadata.name" | grep $DEPLOYMENT || true)
if [ -z "$POD" ]; then
    2> echo "error: failed to locate Pod for Kubernetes Deployment $DEPLOYMENT"
    exit 3
fi

# Just migrate the database.
kubectl exec $POD -- bash -c 'cd /myapp && rake db:migrate'
