// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import * as classic from "@pulumi/gcp";
import * as gcloud from "@pulumi/google-native";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import { dbPassword, dbUsername, project } from "./config";

// Provision a database for our Rails app.
export const instance = new gcloud.sqladmin.v1beta4.Instance("web-db", {
    databaseVersion: "POSTGRES_9_6",
    project: project,
    settings: {
        tier: "db-f1-micro",
        ipConfiguration: {
            authorizedNetworks: [{ value: "0.0.0.0/0" }],
        },
    },
});

const dbName = "app_development";
export const db = new gcloud.sqladmin.v1beta4.Database("db", {
    name: dbName,
    instance: instance.name,
    project: project,
});

const testDbName = "app_test";
export const testDb = new gcloud.sqladmin.v1beta4.Database("testdb", {
    name: testDbName,
    instance: instance.name,
    project: project,
}, {dependsOn: [db]}); // only create one db at a time.

// Create a user with the configured credentials for the Rails app to use.
// TODO: Switch to google native version when User is supported:
// https://github.com/pulumi/pulumi-google-native/issues/47
const user = new classic.sql.User("web-db-user", {
    instance: instance.name,
    name: dbUsername,
    password: dbPassword,
    project: project,
});
