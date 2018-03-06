// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

import * as pulumi from "pulumi";

let config = new pulumi.Config("url-shortener:config");

export let redisPassword = config.require("redisPassword");
