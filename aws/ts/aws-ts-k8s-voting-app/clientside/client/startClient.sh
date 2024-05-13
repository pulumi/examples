#!/bin/bash
set -exu
cd /client/
# Overwriting serverParams.js with the URL given by AWS
echo "window.SERVER_URL = '${SERVER_HOSTNAME}';"  > public/serverParams.js
exec npm start
