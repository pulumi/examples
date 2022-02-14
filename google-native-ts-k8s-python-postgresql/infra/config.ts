// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import { Config } from "@pulumi/pulumi";

const config = new Config("xpresso-gke-demo");

export const project = config.require("project");
export const region = config.require("region");

/// Artifact Registry config

export const artifactRegistryDockerRepositoryId = `${project}-registry`;

/// PostgreSQL config
export const dbName = "app";

/// App config
export const appPort = 8000;

/// Kubernetes config
export const appServiceAccountName = "app-sa";
export const namespace = "default";
