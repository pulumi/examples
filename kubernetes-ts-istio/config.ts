import { Config } from "@pulumi/pulumi";

const config = new Config();

// nodeCount is the number of cluster nodes to provision. Defaults to 3 if unspecified.
export const nodeCount = config.getNumber("nodeCount") || 5;

// nodeMachineType is the machine type to use for cluster nodes. Defaults to n1-standard-1 if unspecified.
// See https://cloud.google.com/compute/docs/machine-types for more details on available machine types.
export const nodeMachineType = config.get("nodeMachineType") || "n1-standard-1";

// masterUsername is the admin username for the cluster.
export const masterUsername = config.get("masterUsername") || "admin";

// masterPassword is the password for the admin user in the cluster.
export const masterPassword = config.require("password");

// username is the admin username for the cluster.
export const username = config.get("username") || "admin";
