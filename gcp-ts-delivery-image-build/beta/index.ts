// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

// Set by the pipeline: the Cloud Run region, and the image the build stage
// pushed, pinned by digest.
const location = config.require("location");
const imageRef = config.require("imageRef");

const service = new gcp.cloudrunv2.Service("app", {
    location,
    ingress: "INGRESS_TRAFFIC_ALL",
    // Lets `pulumi destroy` remove the service.
    deletionProtection: false,
    template: {
        containers: [{
            image: imageRef,
            ports: { containerPort: 8080 },
        }],
        scaling: { maxInstanceCount: 2 },
    },
});

// Anyone can call the service, so the beta check can reach it.
new gcp.cloudrunv2.ServiceIamMember("public", {
    name: service.name,
    location,
    role: "roles/run.invoker",
    member: "allUsers",
});

export const url = service.uri;
