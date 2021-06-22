#!/usr/bin/env bash

set -euo pipefail

# This is temporarily used in performance_metrics_cron.yml GitHub
# Action until the necessary changes are available on latest Pulumi
# tag.

rev="v3.4.1-0.20210611165853-02c33000552c"

echo "replace github.com/pulumi/pulumi/pkg/v3 => github.com/pulumi/pulumi/pkg/v3 $rev" >> misc/test/go.mod
echo "replace github.com/pulumi/pulumi/sdk/v3 => github.com/pulumi/pulumi/sdk/v3 $rev" >> misc/test/go.mod

(cd misc/test && go mod tidy)
