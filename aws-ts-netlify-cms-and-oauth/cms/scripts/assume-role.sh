#!/bin/bash
#
# Configures the local AWS credentials and adds some useful functions to
# the environment. For use in our CI/CD workflows where we use a common
# set of environments and just provide an access key via environment variable.
#
# USAGE:
# 1. Set the AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment
#    for the CI/CD workflow. They should be to a low privledged user.
# 2. Source this file. It will create files in the ~/.aws folder and
#    unset AWS_ACCESS_KEY_ID.
#
# After that, use the AWS SDK like normal. The default profile will use the
# credentials in the initial environment variable. But you can easily change
# AWS accounts by setting the AWS_PROFILE environment variable. (You will set
# AWS_PROFILE="pulumi-ci" in most cases.)
#
# This script also exports two functions: assume_iam_role and unassume_iam_role
# which can be used to assume an IAM role without using AWS_PROFILE.

# Function to use the current AWS credentials to assume an IAM Role.
# This is necessary for situations where we cannot rely on a profile from the
# ~/.aws/config file, or where we need to specify an external ID.
# Usage: assume_iam_role <role-arn> <session-name> [external-id]
function assume_iam_role() {
    # IAM Role ARN to be assumed.
    local ROLE_ARN=${1}
    # Name of the session for auditing purposes.
    local SESSION_NAME=${2}
    # External ID which may be required to assume the role. (Optional)
    local EXTERNAL_ID=${3}

    echo "Assuming IAM Role '${ROLE_ARN}"
    echo "    Session    : ${SESSION_NAME}"
    echo "    External ID: ${EXTERNAL_ID}"

    local CREDS_JSON="{}"
    if [ -z ${EXTERNAL_ID} ]; then
        CREDS_JSON=$(aws sts assume-role \
                 --role-arn "${ROLE_ARN}" \
                 --role-session-name "${SESSION_NAME}" )
    else
        CREDS_JSON=$(aws sts assume-role \
                 --role-arn "${ROLE_ARN}" \
                 --role-session-name "${SESSION_NAME}" \
                 --external-id "${EXTERNAL_ID}" )
    fi

    export AWS_ACCESS_KEY_ID=$(echo ${CREDS_JSON}     | jq ".Credentials.AccessKeyId" --raw-output)
    export AWS_SECRET_ACCESS_KEY=$(echo ${CREDS_JSON} | jq ".Credentials.SecretAccessKey" --raw-output)
    export AWS_SESSION_TOKEN=$(echo ${CREDS_JSON}    | jq ".Credentials.SessionToken" --raw-output)
}

# Clear the environment variables set after calling assume_iam_role to get back to
# the initial state. (Using the default credentials or ${AWS_PROFILE}.)
function unassume_iam_role() {
    unset {AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_SECURITY_TOKEN}
}

# Check information.
if [ -z ${AWS_ACCESS_KEY_ID} ]; then
    echo "ERROR: AWS_ACCESS_KEY_ID not set. Something is not right. (AWS creds not set?)"
fi

if [ ! -z ${AWS_SECURITY_TOKEN} ]; then
    echo "ERROR: AWS_SECURITY_TOKEN is set. Something is not right. (In an assumed role?)"
fi

# Write the AWS access key found in an environment variable to disk, allowing for
# transparent IAM role assumption via the AWS SDK.
function write_aws_config_files() {
    mkdir -p ${HOME}/.aws/

    cat <<EOF >> ${HOME}/.aws/credentials
[default]
aws_access_key_id     = ${AWS_ACCESS_KEY_ID}
aws_secret_access_key = ${AWS_SECRET_ACCESS_KEY}
EOF

    cat <<EOF >> ${HOME}/.aws/config
[default]
region = us-west-2
[profile pulumi-ci]
role_arn = arn:aws:iam::894850187425:role/ContinuousDeliveryAdminRole
source_profile = default
EOF

    # Unset AWS_ACCESS_* so that we don't get confused later when we use AWS_PROFILE.
    echo "Unsetting AWS environment variables to rely on the credentials files."
    unset {AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY}
}

if [ -f "${HOME}/.aws/config" -o -f "${HOME}/.aws/credentials" ]; then
    echo "ERROR: ~/.aws/config or ~/.aws/credentials exist. Not overwriting."
else
    echo "Writing ~/.aws/config and ~/.aws/credentials"
    write_aws_config_files
fi

echo "Current user: $(aws sts get-caller-identity | jq '.Arn')"