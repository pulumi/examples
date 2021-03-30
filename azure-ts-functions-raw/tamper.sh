#!/bin/sh

az group delete --name $(pulumi stack output resourceGroupName) --yes
