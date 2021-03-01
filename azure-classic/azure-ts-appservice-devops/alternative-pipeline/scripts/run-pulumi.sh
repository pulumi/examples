#!/bin/bash

# exit if a command returns a non-zero exit code and also print the commands and their args as they are executed
set -e -x

# Add the pulumi CLI to the PATH
export PATH=$PATH:$HOME/.pulumi/bin

pushd infra/

npm install
npm run build

pulumi stack select dev
pulumi config set --secret sqlUsername $SQL_USERNAME
pulumi config set --secret sqlPassword $SQL_PASSWORD

pulumi up --yes

popd
