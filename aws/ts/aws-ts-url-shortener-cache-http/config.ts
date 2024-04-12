// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

// Get the Redis password from config
export let redisPassword = config.require("redisPassword");
