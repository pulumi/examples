// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as gcp from "@pulumi/gcp";
import { Config } from "@pulumi/pulumi";

const config = new Config();

/// Docker config
export const dockerUsername = config.require("dockerUsername");
export const dockerPassword = config.require("dockerPassword");

/// PostgreSQL config
export const dbUsername = config.require("dbUsername") || "rails";
export const dbPassword = config.require("dbPassword");

/// Kubernetes config
export const clusterNodeCount = config.getNumber("clusterNodeCount") || 3;
export const clusterNodeMachineType = config.get("clusterNodeMachineType") || "n1-standard-1";
export const clusterUsername = config.get("clusterUsername") || "admin";
export const clusterPassword = config.require("clusterPassword");
export const masterVersion = config.get("masterVersion") || gcp.container.getEngineVersions().then(x=> x.latestMasterVersion);
