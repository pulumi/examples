// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import { Config } from "@pulumi/pulumi";

const config = new Config();

// username is the admin username for the cluster.
export const username = config.get("username") || "admin";

// password is the password for the admin user in the cluster.
export const password = config.require("password");
