// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";

let config = new pulumi.Config("url-shortener:config");

export let redisPassword = config.require("redisPassword");
