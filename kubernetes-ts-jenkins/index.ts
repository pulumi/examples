// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as jenkins from "./jenkins";

// Minikube does not implement services of type `LoadBalancer`; require the user to specify if we're
// running on minikube, and if so, create only services of type ClusterIP.
const config = new pulumi.Config();
if (config.require("isMinikube") === "true") {
    throw new Error("This example does not yet support minikube");
}

const instance = new jenkins.Instance({
    name: pulumi.getStack(),
    credentials: {
        username: config.require("username"),
        password: config.require("password"),
    },
    resources: {
        memory: "512Mi",
        cpu: "100m",
    },
});
export const externalIp = instance.externalIp;
