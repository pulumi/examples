// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as delivery from "@pulumi/delivery";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const repository = config.require("repository");
const branch = config.require("branch");
const path = config.require("path");
const location = config.require("location");

const org = pulumi.getOrganization();

// Run the pipeline on every push that touches this example.
const code = new delivery.GitHubSource("code", {
    repository,
    branch,
    trigger: { paths: [`${path}/**`] },
});

// Where Delivery reads this program from is set by `delivery:source` in the
// pipeline stack's config. A push there updates the pipeline.
const pipeline = new delivery.Pipeline("pipeline");

// Build stage: create the registry, build the image and push it, tagged
// with the commit.
const build = new delivery.Stage("build", { pipeline });
const imageStacks = new delivery.Stacks("image", {
    stage: build,
    stacks: {
        image: {
            stack: `${org}/gcp-ts-delivery-image-build-image/image`,
            source: code,
            directory: `${path}/image`,
            config: { commit: code.commit, location },
        },
    },
});

// Beta stage: deploy the exact image the build stage pushed, by digest, to
// Cloud Run, then check that the service answers.
const beta = new delivery.Stage("beta", { pipeline, from: [build] });
const betaStacks = new delivery.Stacks("beta", {
    stage: beta,
    stacks: {
        beta: {
            stack: `${org}/gcp-ts-delivery-image-build-beta/beta`,
            source: code,
            directory: `${path}/beta`,
            // The image stack's outputs are empty until it has run once.
            // Missing values stay undefined, and Pulumi leaves them out.
            config: imageStacks.outputs.apply(outputs => ({
                location,
                imageRef: outputs?.["image"]?.["imageRef"],
            })),
        },
    },
});

// A Job starts with its stage, alongside the stage's stacks, so wait for the
// beta stack before checking its URL.
new delivery.Job("check-url", {
    stage: beta,
    source: code,
    directory: `${path}/pipeline`,
    command: "./check-url.sh",
    environment: betaStacks.outputs.apply(outputs => ({
        SERVICE_URL: outputs?.["beta"]?.["url"],
    })),
}, { dependsOn: [betaStacks] });

// Record the app's URL as the `beta-url` artifact of the release.
new delivery.Artifact("beta-url", {
    stage: beta,
    value: betaStacks.outputs.apply(outputs => outputs?.["beta"]?.["url"]),
});
