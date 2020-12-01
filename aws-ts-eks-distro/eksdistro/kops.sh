#!/usr/bin/env bash

if [ -z "$CLUSTER_NAME" ]; then
    echo "Cluster name must be an FQDN: <yourcluster>.yourdomain.com or <yourcluster>.sub.yourdomain.com"
    read -r -p "What is the name of your Cluster? " CLUSTER_NAME
fi

export CNI_VERSION_URL=https://beta.cdn.model-rocket.aws.dev/kubernetes-1-18/releases/1/artifacts/plugins/v0.8.7/cni-plugins-linux-amd64-v0.8.7.tar.gz
export CNI_ASSET_HASH_STRING=sha256:f168b4e62a1f263b1d81c648339b6a878bbef279c8dd568075604c3750e05298

# Create a unique s3 bucket name, or use an existing S3_BUCKET environment variable
export S3_BUCKET=${S3_BUCKET:-"kops-state-store-$(cat /dev/random | LC_ALL=C tr -dc "[:alpha:]" | tr '[:upper:]' '[:lower:]' | head -c 32)"}
export KOPS_STATE_STORE=s3://$S3_BUCKET
echo "Using S3 bucket $S3_BUCKET: to use with kops run"
echo
echo "    export KOPS_STATE_STORE=s3://$S3_BUCKET"
echo "    export CNI_VERSION_URL=$CNI_VERSION_URL"
echo "    export CNI_ASSET_HASH_STRING=$CNI_ASSET_HASH_STRING"
echo

# Create the bucket if it doesn't exist
_bucket_name=$(aws s3api list-buckets  --query "Buckets[?Name=='$S3_BUCKET'].Name | [0]" --out text)
if [ $_bucket_name == "None" ]; then
    echo "Creating S3 bucket: $S3_BUCKET"
    if [ "$AWS_DEFAULT_REGION" == "us-east-1" ]; then
        aws s3api create-bucket --bucket $S3_BUCKET
    else
        aws s3api create-bucket --bucket $S3_BUCKET --create-bucket-configuration LocationConstraint=$AWS_DEFAULT_REGION
    fi
fi

kops create cluster $CLUSTER_NAME \
    --zones "us-west-2a,us-west-2b,us-west-2c" \
    --master-zones "us-west-2a" \
    --networking kubenet \
    --node-count 3 \
    --node-size m5.xlarge \
    --kubernetes-version https://beta.cdn.model-rocket.aws.dev/kubernetes-1-18/releases/1/artifacts/kubernetes/v1.18.9 \
    --master-size m5.large \
    --dry-run \
    -o yaml > $CLUSTER_NAME.yaml
echo "Add the following content to your Cluster spec in $CLUSTER_NAME.yaml"
echo
cat << EOF >> /dev/stdout
  kubeAPIServer:
    image: 520703868821.dkr.ecr.us-east-1.amazonaws.com/kubernetes/kube-apiserver:v1.18.9-eks-1-18-1
  kubeControllerManager:
    image: 520703868821.dkr.ecr.us-east-1.amazonaws.com/kubernetes/kube-controller-manager:v1.18.9-eks-1-18-1
  kubeScheduler:
    image: 520703868821.dkr.ecr.us-east-1.amazonaws.com/kubernetes/kube-scheduler:v1.18.9-eks-1-18-1
  kubeProxy:
    image: 520703868821.dkr.ecr.us-east-1.amazonaws.com/kubernetes/kube-proxy:v1.18.9-eks-1-18-1
  # Metrics Server will be supported with kops 1.19
  metricsServer:
    enabled: true
    image: 520703868821.dkr.ecr.us-east-1.amazonaws.com/kubernetes-sigs/metrics-server:v0.4.0-eks-1-18-1
  authentication:
    aws:
      image: 520703868821.dkr.ecr.us-east-1.amazonaws.com/kubernetes-sigs/aws-iam-authenticator:v0.5.2-eks-1-18-1
  kubeDNS:
    provider: CoreDNS
    coreDNSImage: 520703868821.dkr.ecr.us-east-1.amazonaws.com/coredns/coredns:v1.7.0-eks-1-18-1
    externalCoreFile: |
      .:53 {
          errors
          health {
            lameduck 5s
          }
          kubernetes cluster.local. in-addr.arpa ip6.arpa {
            pods insecure
            #upstream
            fallthrough in-addr.arpa ip6.arpa
          }
          prometheus :9153
          forward . /etc/resolv.conf
          loop
          cache 30
          loadbalance
          reload
      }
  masterKubelet:
    podInfraContainerImage: 520703868821.dkr.ecr.us-east-1.amazonaws.com/kubernetes/pause:v1.18.9-eks-1-18-1
  # kubelet might already be defined, append the following config
  kubelet:
    podInfraContainerImage: 520703868821.dkr.ecr.us-east-1.amazonaws.com/kubernetes/pause:v1.18.9-eks-1-18-1
EOF
