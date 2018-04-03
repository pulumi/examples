#!/bin/bash
# usage: install-pulumi.sh <version-to-install>
set -o nounset -o errexit -o pipefail

if [ -z "${PULUMI_ACCESS_TOKEN:-}" ]; then
    >&2 echo "error: please set PULUMI_ACCESS_TOKEN before running this script"
    exit 1
fi

if [ -z "${1:-}" ]; then
    >&2 echo "usage: install-pulumi.sh <version-to-install>"
    exit 1
fi

function on_exit {
    [ ! -e ${WORK_DIR} ] || rm -rf ${WORK_DIR}
}

OS=""
case $(uname) in
    "Linux") OS="linux";;
    "Darwin") OS="darwin";;
    *) echo "error: unknown host os $(uname)" ; exit 1;;
esac

RELEASE_URL="${PULUMI_API:-https://api.pulumi.com}/releases/sdk/pulumi-${1}-${OS}.x64.tar.gz"
WORK_DIR="$(mktemp -d)"

trap on_exit EXIT

curl -H "Authorization: token ${PULUMI_ACCESS_TOKEN}" ${RELEASE_URL} | tar -C ${WORK_DIR} -zxf -

# In Pulumi's install.sh, it will print an error message to the console, but it won't
# dump the install log by default. So let's print out the install log in this case.
if ! ${WORK_DIR}/pulumi/install.sh; then
    cat ${WORK_DIR}/pulumi/install.log
    exit 1
fi
