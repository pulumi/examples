#!/bin/bash
#
# This script exports two functions: assume_iam_role and unassume_iam_role
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

