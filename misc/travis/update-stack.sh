#!/bin/bash

set -o nounset -o errexit -o pipefail

# NOTE: You need to configure Travis to set the following environment variables:
#     PULUMI_ACCESS_TOKEN       Your Pulumi access token, from https://pulumi.com/account.
if [ -z "${PULUMI_ACCESS_TOKEN}" ]; then
    >&2 echo "error: Missing PULUMI_ACCCESS_TOKEN; required to log into Pulumi.com"
fi

echo "Deploying Pulumi Application via Travis"
echo "TRAVIS_BRANCH    : ${TRAVIS_BRANCH}"
echo "TRAVIS_EVENT_TYPE: ${TRAVIS_EVENT_TYPE}"

# Only do deployments for pushes, not PRs.
if [ "$TRAVIS_EVENT_TYPE" != "push" ]; then
    echo "Non-push event type.  Ignoring."
    exit 0
fi

# Set PULUMI_STACK_NAMES to be one or more Pulumi stacks you wish to update.  DIRS should contain the location of
# the Pulumi Program to perform the preview/update.
BASE=$(dirname "${BASH_SOURCE}")
case "$TRAVIS_BRANCH" in
    master)
        export PULUMI_STACK_NAMES=( "development" )
        export DIRS=( "$BASE/../infra" )
        ;;
    staging)
        export PULUMI_STACK_NAMES=( "staging" )
        export DIRS=( "$BASE/../infra" )
        ;;
    production)
        # Deploy to two environments in production, west coast first, east coast second.
        export PULUMI_STACK_NAMES=( "production-west" "production-east" )
        export DIRS=( "$BASE/../infra" "$BASE/../infra" )
        ;;
    *)
        echo "Branch '${TRAVIS_BRANCH}' is not associated with a Pulumi stack.  Ignoring."
        exit 0
esac

# For each Stack, do a preview/update.
for ((i=0; i<${#PULUMI_STACK_NAMES[*]}; i++));
do
    :
    export PULUMI_STACK_NAME="${PULUMI_STACK_NAMES[i]}"
    export DIR="${DIRS[i]}"

    # CD into the Pulumi program folder.
    cd "${DIR}"

    # Authenticate with Pulumi so we fail early if we cannot.
    echo "Logging into Pulumi.com:"
    pulumi login
    pulumi stack select $PULUMI_STACK_NAME

    # Install dependencies and build the program.
    yarn install
    yarn build

    # First do a preview.  This step is optional, but provides a basic check against a class of runtime errors
    # in your Pulumi program. (e.g. typos, missing dependencies, etc.)
    echo "Previewing Pulumi updates:"
    pulumi preview

    # Finally, perform the actual update.
    echo "Deploying Pulumi updates:"
    pulumi up
done
