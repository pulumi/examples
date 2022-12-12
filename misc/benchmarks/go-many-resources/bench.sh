#!/usr/bin/env bash

set -euo pipefail

pulumi stack rm --force --yes
pulumi stack init bench40
pulumi stack select bench40

echo "BRANCH:"

# (cd ~/code/pulumi && git co t0yv0/reduce-httpclient-mem-residency-peak-mem)C
(cd ~/code/pulumi && git co t0yv0/force-patch-peak-mem)
(cd ~/code/pulumi && git br | grep '*')
(cd ~/code/pulumi/pkg/backend/httpstate/client && go test)
(cd ~/code/pulumi && make install)

pulumi config set resource_count         32
pulumi config set resource_payload_bytes 1048576

# pulumi config set resource_payload_bytes   16777216

# echo "^^ destroy"
# pulumi destroy --yes

# echo "^^ pulumi up control group"

export PULUMI_TRACING_NO_PAYLOADS=1

# /usr/bin/time -l pulumi up --yes --skip-preview --profiling conrolgroup


# echo "^^ destroy"
# pulumi destroy --yes

# echo "^^ pulumi up testgroup"
# export PULUMI_OPTIMIZED_CHECKPOINT_PATCH=1
# /usr/bin/time -l pulumi up --yes --skip-preview --profiling testgroup


# echo "^^ destroy"
# pulumi destroy --yes

echo "^^ pulumi up testgroup4"
rm -f $TMPDIR/q
export PULUMI_OPTIMIZED_CHECKPOINT_PATCH=0
export PATH=~/.pulumi-dev/bin:$PATH
rm -rf testgroup4*
rm -rf last.trace

# export PULUMI_MAX_MEMORY=50371840
/usr/bin/time -l pulumi up --yes --skip-preview --profiling testgroup4 # --tracing file:./last.trace
