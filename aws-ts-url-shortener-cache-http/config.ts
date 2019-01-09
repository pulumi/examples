// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";

let config = new pulumi.Config();

// Get the Redis password from config
export let redisPassword = config.require("redisPassword");
