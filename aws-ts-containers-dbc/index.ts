// Copyright 2024, Pulumi Corporation.  All rights reserved.

// Pulumi program to build with DBC and push a Docker image
// to AWS ECR and deploys it in AWS Fargate with an ALB.

// Pre-requisites:
// - AWS Credentials
// - Docker Build Cloud (DBC)
// - Docker Desktop / CLI
// - Pulumi CLI (https://www.pulumi.com/docs/get-started/install/)
// - *Recommended* Pulumi Cloud account (https://app.pulumi.com/signup)

// This Pulumi template is meant to be copied via:
// $ pulumi new https://github.com/pulumi/examples/tree/master/aws-ts-containers-dbc
// Once copied to your machine, feel free to edit as needed.

// As a good practice, update any dependencies to the latest version.
// $ npm update --save

// How to run this program in your terminal:
// $ pulumi up

// Import required libraries, update package.json if you add more.
// (Recommended to run `npm update --save` after adding more libraries)
import * as aws from "@pulumi/aws"; // Required for ECS
import * as awsx from "@pulumi/awsx";
import * as docker_build from "@pulumi/docker-build";
import * as pulumi from "@pulumi/pulumi"; // Required for Config and interpolation

// Read the current stack configuration, see Pulumi.<STACK>.yaml file
// Configuration values can be set with the pulumi config set command
// OR by editing the Pulumi.<STACK>.yaml file.
// OR during the pulumi new wizard.
const config = new pulumi.Config();
// Docker Build Cloud (DBC) builder name
const builder = config.require("builder"); // Example, "cloud-pulumi-my-cool-builder"

// An ECS cluster to deploy into.
const cluster = new aws.ecs.Cluster("cluster", {});

// An ALB to serve the container endpoint to the internet.
const loadbalancer = new awsx.lb.ApplicationLoadBalancer("loadbalancer", {});

// An ECR repository to store our application's container image.
const ecr = new awsx.ecr.Repository("repo", {
    forceDelete: true,
});

// Grab auth credentials for ECR.
const auth = aws.ecr.getAuthorizationTokenOutput({
    registryId: ecr.repository.registryId,
});

// Build and publish our application's container image from ./app to the ECR repository.
// This image will be built with Docker Build Cloud (DBC) and pushed to ECR.
// It uses the Docker Build provider
const image = new docker_build.Image("image", {
    //  ____             _               ____        _ _     _
    // |  _ \  ___   ___| | _____ _ __  | __ ) _   _(_) | __| |
    // | | | |/ _ \ / __| |/ / _ \ '__| |  _ \| | | | | |/ _` |
    // | |_| | (_) | (__|   <  __/ |    | |_) | |_| | | | (_| |
    // |____/ \___/ \___|_|\_\___|_|    |____/ \__,_|_|_|\__,_|
    //  / ___| | ___  _   _  __| |
    // | |   | |/ _ \| | | |/ _` |
    // | |___| | (_) | |_| | (_| |
    //  \____|_|\___/ \__,_|\__,_|
    // Enable exec to run a custom docker-buildx binary with support
    // for Docker Build Cloud (DBC).
    exec: true,
    // Configures the name of your existing buildx builder to use.
    builder: {
        name: builder, // Example, "cloud-pulumi-my-cool-builder",
    },
    //                 _     _
    //   ___ __ _  ___| |__ (_)_ __   __ _
    //  / __/ _` |/ __| '_ \| | '_ \ / _` |
    // | (_| (_| | (__| | | | | | | | (_| |
    //  \___\__,_|\___|_| |_|_|_| |_|\__, |
    //                               |___/
    // Use the pushed image as a cache source.
    cacheFrom: [{
        registry: {
            ref: pulumi.interpolate`${ecr.repository.repositoryUrl}:cache`,
        },
    }],
    cacheTo: [{
        registry: {
            imageManifest: true,
            ociMediaTypes: true,
            ref: pulumi.interpolate`${ecr.repository.repositoryUrl}:cache`,
        },
    }],
    // (Learn more about interpolation with Pulumi)
    // https://www.pulumi.com/docs/concepts/inputs-outputs/all/#using-string-interpolation

    //                  _ _   _             _       _    __
    //  _ __ ___  _   _| | |_(_)      _ __ | | __ _| |_ / _| ___  _ __ _ __ ___
    // | '_ ` _ \| | | | | __| |_____| '_ \| |/ _` | __| |_ / _ \| '__| '_ ` _ \
    // | | | | | | |_| | | |_| |_____| |_) | | (_| | |_|  _| (_) | |  | | | | | |
    // |_| |_| |_|\__,_|_|\__|_|     | .__/|_|\__,_|\__|_|  \___/|_|  |_| |_| |_|
    //                               |_|
    // Build multi-platforms
    platforms: [
        docker_build.Platform.Linux_amd64,
        // add more as needed
    ],
    //                 _     _
    //  _ __ ___  __ _(_)___| |_ _ __ _   _
    // | '__/ _ \/ _` | / __| __| '__| | | |
    // | | |  __/ (_| | \__ \ |_| |  | |_| |
    // |_|  \___|\__, |_|___/\__|_|   \__, |
    //           |___/                |___/
    push: true,
    // Provide our ECR credentials.
    registries: [{
        address: ecr.repository.repositoryUrl,
        password: auth.password,
        username: auth.userName,
    }],
    //
    // Other parameters
    //
    // Tag our image with our ECR repository's address.
    tags: [pulumi.interpolate`${ecr.repository.repositoryUrl}:latest`],
    // The Dockerfile resides in the app directory for this example.
    context: {
        location: "app",
    },
});

// Deploy an ECS Service on Fargate to host the application container.
const service = new awsx.ecs.FargateService("service", {
    cluster: cluster.arn,
    assignPublicIp: true,
    taskDefinitionArgs: {
        container: {
            name: "service-container",
            image: image.ref,
            cpu: 128,
            memory: 512,
            essential: true,
            portMappings: [{
                containerPort: 80,
                targetGroup: loadbalancer.defaultTargetGroup,
            }],
        },
    },
});

// The URL at which the container's HTTP endpoint will be available.
export const url = pulumi.interpolate`http://${loadbalancer.loadBalancer.dnsName}`;
