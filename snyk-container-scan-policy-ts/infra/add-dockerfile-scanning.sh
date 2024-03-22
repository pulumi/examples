#!/bin/bash
echo "$(jq --arg pwd "$(pwd)" '.["snyk-container-scan"] += {"pulumiProgramAbsPath": $pwd}' policy-config.json)" > policy-config.json
