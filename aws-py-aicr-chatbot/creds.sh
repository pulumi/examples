# Source this before pulumi commands:  . ./creds.sh
# Uses the my-aws-profile profile (credential_process), so the AWS SDK fetches
# fresh credentials on demand -- no more mid-deploy token expiry.
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN AWS_CREDENTIAL_EXPIRATION
export AWS_PROFILE=my-aws-profile
if ! aws sts get-caller-identity --query Arn --output text; then
    echo "Session expired -> running 'aws login' (finish in the browser), then re-source this file."
    # The login must write to the *default* profile (my-aws-profile only derives
    # from it), so shed AWS_PROFILE for the login call.
    AWS_PROFILE= aws login --profile default
    return 1 2>/dev/null || exit 1
fi
echo "AWS_PROFILE=my-aws-profile active; credentials refresh automatically."
