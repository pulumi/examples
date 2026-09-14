// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

import * as dockerbuild from "@pulumi/docker-build";
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

// Build and push image to gcr repository

const imageName = "ruby-app";

const myImage = new dockerbuild.Image(imageName, {
    tags: [pulumi.interpolate`gcr.io/${gcp.config.project}/${imageName}:latest`],
    context: {
        location: "./app",
    },
    push: true,
});

// The fully-qualified `<tag>@sha256:...` reference of the pushed image.
export const ref = myImage.ref;
// Digest exported so it's easy to match updates happening in cloud run project
export const digest = myImage.digest;
