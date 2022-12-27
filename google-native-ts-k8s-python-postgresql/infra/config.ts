// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import { Config } from "@pulumi/pulumi";
import * as random from "@pulumi/random";

const config = new Config();

export const projectId = config.require("projectId");
export const region = config.require("region");

/// App config
export const appPort = parseInt(config.require("appPort"));

/// Kubernetes config
export const k8sNamespace = config.get("k8sNamespace") || "default";
export const k8sServiceAccountName = new random.RandomPet(
  "k8sServiceAccountName",
  { length: 2 }
).id;
