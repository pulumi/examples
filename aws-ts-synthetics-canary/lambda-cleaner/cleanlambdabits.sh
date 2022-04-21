# Until https://github.com/hashicorp/terraform-provider-aws/issues/19288 is fixed, one needs to clean up some canary detritus after deletion.
# Specifically when a canary is created, a lambda function and a lambda layer is created.
# These resources are not deleted when the canary is deleted.
# So this script in conjunction with the Pulumi command provider is run on destroy to cleanup a canary's lambda function and related lambda layers.
# Assumes AWS CLI is installed.

# Get the environment variable values passed from the command provider
LAMBDA_FN_NAME=${CANARY_LAMBDA_FN_NAME}
LAMBDA_FN_LATEST_VERSION=${CANARY_LAMBDA_FN_LATEST_VERSION}

# Delete the lambda function.
aws lambda delete-function --function-name ${LAMBDA_FN_NAME}

# Loop through and delete the lambda layers



