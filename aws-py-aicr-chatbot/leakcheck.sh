#!/usr/bin/env bash
# After `pulumi destroy`: list anything of ours that may have leaked. Read-only.
#   . ./creds.sh && ./leakcheck.sh [name-prefix=aicr-chatbot]
set -uo pipefail
PREFIX=${1:-aicr-chatbot}
export AWS_REGION=${AWS_REGION:-us-east-1}
leaks=0
report() { local what=$1 out=$2; if [ -n "$out" ]; then echo "LEAK  $what:"; echo "$out" | sed 's/^/      /'; leaks=1; else echo "ok    $what"; fi; }

report "EKS clusters ($PREFIX*)" \
    "$(aws eks list-clusters --query "clusters[?starts_with(@,'$PREFIX')]" --output text)"
report "classic ELBs (any -- the chatbot Service creates one; other teams' show here too)" \
    "$(aws elb describe-load-balancers --query 'LoadBalancerDescriptions[].[LoadBalancerName,CreatedTime]' --output text)"
report "k8s-elb-* security groups" \
    "$(aws ec2 describe-security-groups --filters Name=group-name,Values='k8s-elb-*' --query 'SecurityGroups[].[GroupId,GroupName]' --output text)"
report "security groups tagged for $PREFIX clusters" \
    "$(aws ec2 describe-security-groups --query "SecurityGroups[?Tags[?starts_with(Key,'kubernetes.io/cluster/$PREFIX')]].[GroupId,GroupName]" --output text)"
report "unattached EBS volumes" \
    "$(aws ec2 describe-volumes --filters Name=status,Values=available --query 'Volumes[].[VolumeId,Size,CreateTime]' --output text)"
report "ECR repositories ($PREFIX*)" \
    "$(aws ecr describe-repositories --query "repositories[?starts_with(repositoryName,'$PREFIX')].repositoryName" --output text)"
report "IAM roles ($PREFIX*)" \
    "$(aws iam list-roles --query "Roles[?starts_with(RoleName,'$PREFIX')].RoleName" --output text)"
report "auto scaling groups ($PREFIX*)" \
    "$(aws autoscaling describe-auto-scaling-groups --query "AutoScalingGroups[?starts_with(AutoScalingGroupName,'$PREFIX')].AutoScalingGroupName" --output text)"
report "running instances tagged nvidia.com/aicr=chatbot-demo" \
    "$(aws ec2 describe-instances --filters Name=tag:nvidia.com/aicr,Values=chatbot-demo Name=instance-state-name,Values=pending,running,stopping,stopped --query 'Reservations[].Instances[].[InstanceId,State.Name]' --output text)"
report "available ENIs from $PREFIX clusters or stray VPC-CNI interfaces (aws-K8S-*; these block SG deletion)" \
    "$(aws ec2 describe-network-interfaces --filters Name=status,Values=available --query "NetworkInterfaces[?contains(Description,'$PREFIX') || starts_with(Description,'aws-K8S-')].[NetworkInterfaceId,Description,Groups[0].GroupName]" --output text)"

echo
[ "$leaks" = 0 ] && echo "leakcheck: clean" || { echo "leakcheck: review the LEAK lines (some may belong to other stacks)"; exit 1; }
