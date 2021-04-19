// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import { Config } from "@pulumi/pulumi";
import * as random from "@pulumi/random";

const config = new Config();

const gcloudConfig = new Config("google-native");
export const project = gcloudConfig.require("project");
export const region = gcloudConfig.require("region");

/// PostgreSQL config
export const dbUsername = config.get("dbUsername") || "rails";
export const dbPassword = config.get("dbPassword") || genRandomPassword("dbPasswordGen", 8);

/// Kubernetes config
export const clusterNodeCount = config.getNumber("clusterNodeCount") || 1;
export const clusterNodeMachineType = config.get("clusterNodeMachineType") || "n1-standard-1";
export const clusterUsername = config.get("clusterUsername") || "admin";
export const clusterPassword = config.get("clusterPassword") || genRandomPassword("clusterPasswordGen", 16);
export const masterVersion = config.get("masterVersion") || "1.19.9-gke.100";

function genRandomPassword(name: string, length: number):pulumi.Output<string>{
    return new random.RandomString(name, {
        upper: false,
        number: true,
        special: true,
        length: length,
    }).result;
}