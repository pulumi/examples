// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

// Get the Redis password from config
export const redisPassword = config.require("redisPassword");
