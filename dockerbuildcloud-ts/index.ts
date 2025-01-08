// Copyright 2024, Pulumi Corporation.  All rights reserved.

// Pulumi program to build a docker image with Docker Build Cloud (DBC)

// This Pulumi template is meant to be copied via:
// $ pulumi new https://github.com/pulumi/examples/tree/master/dockerbuild-ts-dbc
// Once copied to your machine, feel free to edit as needed.

// How to run this program in your terminal:
// $ pulumi up

// Pre-requisites:
// - Docker Build Cloud (DBC) builder  (https://build.docker.com/)
//   !! You *must* complete the DBC builder setup steps @ https://docs.docker.com/build/cloud/setup/#steps
// - Docker Desktop / CLI
// - Pulumi CLI (https://www.pulumi.com/docs/get-started/install/)
// - *Recommended* Pulumi Cloud account (https://app.pulumi.com/signup)
// - npm (https://www.npmjs.com/get-npm)


// Import required libraries, update package.json if you add more.
// (Recommended to run `npm update --save` after adding more libraries)
import * as dockerBuild from "@pulumi/docker-build";
import * as pulumi from "@pulumi/pulumi"; // Required for Config

// Read the current stack configuration, see Pulumi.<STACK>.yaml file
// Configuration values can be set with the pulumi config set command
// OR by editing the Pulumi.<STACK>.yaml file.
// OR during the pulumi new wizard.
const config = new pulumi.Config();
// Docker Build Cloud (DBC) builder name
const builder = config.require("builder"); // Example, "cloud-pulumi-my-cool-builder"

const image = new dockerBuild.Image("image", {
    // Enable exec to run a custom docker-buildx binary with support
    // for Docker Build Cloud (DBC).
    exec: true,
    // Configures the name of your existing buildx builder to use.
    builder: {
        name: builder, // Example, "cloud-pulumi-my-cool-builder",
    },
    push: false,
    // Silence warning: "No exports were specified so the build
    // will only remain in the local build cache."
    exports: [{
        cacheonly: {},
    }],
    //
    // Other parameters
    //
    // Tag our image
    tags: [`nginx:latest`],
    // The Dockerfile resides in the app directory for this example.
    context: {
        location: "app",
    },
});
