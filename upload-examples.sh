#!/bin/bash
# publish-examples.sh downloads a GitHub zipfile of examples repo and writes to
# s3://rel.pulumi.com/releases/examples/pulumi-examples.zip.
set -o nounset -o errexit -o pipefail

ROOT=$(dirname $0)
EXAMPLES_FILENAME="pulumi.examples.zip"
EXAMPLES_PATH="${ROOT}/${EXAMPLES_FILENAME}"

echo -e "Downloading ${EXAMPLES_PATH} to publish to S3"

# Download the zipfile for the examples repo at master
curl -H "Authorization: token ${GITHUB_TOKEN}" \
     -L "https://github.com/pulumi/examples/archive/master.zip" > ${EXAMPLES_PATH}

# Assume the UploadPulumiReleases role first
CREDS_JSON=$(aws sts assume-role \
                 --role-arn "arn:aws:iam::058607598222:role/UploadPulumiReleases" \
                 --role-session-name "upload-plugin-pulumi-resource-aws" \
                 --external-id "upload-pulumi-release")

# Use the credentials we just assumed
export AWS_ACCESS_KEY_ID=$(echo ${CREDS_JSON}     | jq ".Credentials.AccessKeyId" --raw-output)
export AWS_SECRET_ACCESS_KEY=$(echo ${CREDS_JSON} | jq ".Credentials.SecretAccessKey" --raw-output)
export AWS_SECURITY_TOKEN=$(echo ${CREDS_JSON}    | jq ".Credentials.SessionToken" --raw-output)

aws s3 cp --only-show-errors "${EXAMPLES_PATH}" "s3://rel.pulumi.com/examples/${EXAMPLES_FILENAME}" 

rm "${EXAMPLES_PATH}"
