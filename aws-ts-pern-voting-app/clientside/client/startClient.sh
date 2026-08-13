#!/bin/bash
set -exu
cd /client/
# Overwriting serverParams.js with the URL given by AWS. This is written into the
# production build, which is what `serve` hosts.
echo "window.SERVER_URL = '${SERVER_HOSTNAME}';"  > build/serverParams.js
exec serve --single --listen 3000 build
