// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as gcp from "@pulumi/gcp";
import { Config } from "@pulumi/pulumi";
import * as random from "@pulumi/random";

const config = new Config();

// nodeCount is the number of cluster nodes to provision. Defaults to 3 if unspecified.
export const nodeCount = config.getNumber("nodeCount") || 3;

// nodeMachineType is the machine type to use for cluster nodes. Defaults to n1-standard-1 if unspecified.
// See https://cloud.google.com/compute/docs/machine-types for more details on available machine types.
export const nodeMachineType = config.get("nodeMachineType") || "n1-standard-1";

// username is the admin username for the cluster.
export const username = config.get("username") || "admin";

// password is the password for the admin user in the cluster.
// If a password is not set, a strong random password will be generated.
export const password = config.get("password") || new random.RandomPassword(
    "password", { length: 20, special: true }).result;

// GKE master version
// Default to the latest available version.
export const masterVersion = config.get("masterVersion") ||
    gcp.container.getEngineVersions().then(it => it.latestMasterVersion);
