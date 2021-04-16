// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import { Config } from "@pulumi/pulumi";

const config = new Config();

const gcloudConfig = new Config("google-native");
export const project = gcloudConfig.require("project");
export const region = gcloudConfig.require("region");
export const zone = gcloudConfig.require("zone");


/// PostgreSQL config
export const dbUsername = config.require("dbUsername") || "rails";
export const dbPassword = config.require("dbPassword");

/// Kubernetes config
export const clusterNodeCount = config.getNumber("clusterNodeCount") || 1;
export const clusterNodeMachineType = config.get("clusterNodeMachineType") || "n1-standard-1";
export const clusterUsername = config.get("clusterUsername") || "admin";
export const clusterPassword = config.require("clusterPassword");
export const masterVersion = config.get("masterVersion");
