// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as classic from "@pulumi/gcp";
import * as gcp from "@pulumi/gcp-native";
import { dbPassword, dbUsername, project } from "./config";

// Provision a database for our Rails app.
const instanceName = "pgdb";
export const instance = new gcp.sqladmin.v1beta4.Instance("web-db", {
    databaseVersion: "POSTGRES_9_6",
    project: project,
    name: instanceName,
    instance:  instanceName,
    settings: {
        tier: "db-f1-micro",
        ipConfiguration: {
            authorizedNetworks: [{ value: "0.0.0.0/0" }],
        },
    },
});

// Create a user with the configured credentials for the Rails app to use.
// TODO: Switch to gcp native version when User is supported.
const user = new classic.sql.User("web-db-user", {
    instance: instance.name,
    name: dbUsername,
    password: dbPassword,
});
