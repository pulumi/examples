// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import { Config } from "@pulumi/pulumi";

const config = new Config();

const gcpConfig = new Config("gcp");
export const project = gcpConfig.require("project");
export const region = gcpConfig.require("region");
export const zone = gcpConfig.require("zone");


/// PostgreSQL config
export const dbUsername = config.require("dbUsername") || "rails";
export const dbPassword = config.require("dbPassword");

/// Kubernetes config
export const clusterNodeCount = config.getNumber("clusterNodeCount") || 3;
export const clusterNodeMachineType = config.get("clusterNodeMachineType") || "n1-standard-1";
export const clusterUsername = config.get("clusterUsername") || "admin";
export const clusterPassword = config.require("clusterPassword");
export const masterVersion = config.get("masterVersion");
