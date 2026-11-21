#!/usr/bin/env bash
# Pre-flight checks before `pulumi up`. Read-only; costs nothing.
# Usage: ./preflight.sh
set -uo pipefail
cd "$(dirname "$0")"

REGION=${AWS_REGION:-us-east-1}
INSTANCE_TYPE=${INSTANCE_TYPE:-$(pulumi config get instanceType 2>/dev/null || echo g6.2xlarge)}
NODE_COUNT=${NODE_COUNT:-$(pulumi config get nodeCount 2>/dev/null || echo 2)}
K8S_VERSION=${K8S_VERSION:-$(pulumi config get k8sVersion 2>/dev/null || echo 1.35)}
export AWS_REGION=$REGION

fail=0
ok()   { echo "  ok    $*"; }
warn() { echo "  WARN  $*"; }
bad()  { echo "  FAIL  $*"; fail=1; }

echo "AWS identity"
if arn=$(aws sts get-caller-identity --query Arn --output text 2>/dev/null); then ok "$arn"; else bad "no AWS credentials (set AWS_PROFILE or log in with aws sso login)"; fi

echo "G-instance vCPU quota (need $((NODE_COUNT * 8)) for ${NODE_COUNT}x ${INSTANCE_TYPE})"
quota=$(aws service-quotas get-service-quota --service-code ec2 --quota-code L-DB2E81BA --query Quota.Value --output text 2>/dev/null)
if [ -n "$quota" ] && [ "${quota%.*}" -ge $((NODE_COUNT * 8)) ]; then ok "quota is $quota vCPU"; else bad "quota is '${quota:-unknown}' vCPU"; fi

echo "$INSTANCE_TYPE offered in $REGION AZs"
azs=$(aws ec2 describe-instance-type-offerings --location-type availability-zone \
      --filters "Name=instance-type,Values=$INSTANCE_TYPE" --query 'InstanceTypeOfferings[].Location' --output text 2>/dev/null | tr '\t' ' ')
if [ -n "$azs" ]; then ok "$azs"; else bad "not offered (fallback: pulumi config set instanceType g5.2xlarge)"; fi

echo "Ubuntu EKS AMI for Kubernetes $K8S_VERSION"
ami=$(aws ec2 describe-images --owners 099720109477 \
      --filters "Name=name,Values=ubuntu-eks/k8s_${K8S_VERSION}/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" \
      --query 'sort_by(Images,&CreationDate)[-1].[ImageId,Name]' --output text 2>/dev/null)
if [ -n "$ami" ] && [ "$ami" != "None	None" ]; then ok "$ami"; else bad "no Canonical AMI found for k8s_$K8S_VERSION"; fi

echo "Default VPC subnets (shared with other clusters; classic ELB placement falls back to node subnets)"
vpc=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text 2>/dev/null)
if [ -n "$vpc" ] && [ "$vpc" != "None" ]; then
    ok "default VPC $vpc"
    tagged=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpc" "Name=tag-key,Values=kubernetes.io/role/elb" --query 'length(Subnets)' --output text 2>/dev/null)
    [ "${tagged:-0}" -gt 0 ] && ok "$tagged subnets carry kubernetes.io/role/elb" || warn "no subnets tagged kubernetes.io/role/elb (fine: the CCM uses the nodes' public subnets)"
else
    bad "no default VPC"
fi

echo "Existing EKS clusters (cost check)"
clusters=$(aws eks list-clusters --query 'clusters' --output text 2>/dev/null | tr '\t' ' ')
[ -n "$clusters" ] && warn "running: $clusters" || ok "none"

echo "Local toolchain"
for tool in pulumi kubectl docker python3; do command -v "$tool" >/dev/null && ok "$tool" || bad "$tool missing"; done
docker info >/dev/null 2>&1 && ok "docker daemon" || bad "docker daemon not running (image build needs it)"
docker buildx version >/dev/null 2>&1 && ok "docker buildx" || bad "docker buildx missing"

echo
if [ "$fail" = 0 ]; then echo "preflight: all good"; else echo "preflight: fix the FAIL lines first"; exit 1; fi
