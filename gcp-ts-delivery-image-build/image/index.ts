// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as dockerBuild from "@pulumi/docker-build";
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

// Set by the pipeline: the commit being built, and the Artifact Registry
// location (for example europe-west2).
const commit = config.require("commit");
const location = config.require("location");

const repository = new gcp.artifactregistry.Repository("images", {
    location,
    repositoryId: "delivery-image-build-example",
    format: "DOCKER",
    // A tag always points at the image built from that commit.
    dockerConfig: { immutableTags: true },
    // KEEP wins over DELETE: the 10 newest images survive regardless of age.
    cleanupPolicies: [
        {
            id: "keep-10-most-recent",
            action: "KEEP",
            mostRecentVersions: { keepCount: 10 },
        },
        {
            id: "delete-older-than-14-days",
            action: "DELETE",
            condition: { tagState: "ANY", olderThan: "1209600s" },
        },
    ],
});

// A short-lived OAuth token from the stack's GCP login, used to push.
const clientConfig = gcp.organizations.getClientConfigOutput();

const imageName = "app";
const app = new dockerBuild.Image(imageName, {
    context: { location: "../app" },
    platforms: ["linux/amd64"],
    tags: [pulumi.interpolate`${repository.registryUri}/${imageName}:${commit}`],
    push: true,
    registries: [{
        address: `${location}-docker.pkg.dev`,
        username: "oauth2accesstoken",
        password: pulumi.secret(clientConfig.accessToken),
    }],
});

// The pushed image, pinned by digest. Later stages use this exact image.
export const imageRef = app.ref;
