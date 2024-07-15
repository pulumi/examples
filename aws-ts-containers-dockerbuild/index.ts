// Copyright 2024, Pulumi Corporation.  All rights reserved.

// Import required libraries
import * as aws from "@pulumi/aws"; // Required for ECS
import * as awsx from "@pulumi/awsx";
import * as dockerBuild from "@pulumi/docker-build";
import * as pulumi from "@pulumi/pulumi"; // Required for Config and interpolation

// Read the current stack configuration, see Pulumi.<STACK>.yaml file
// Configuration values can be set with the pulumi config set command
// OR by editing the Pulumi.<STACK>.yaml file.
// OR during the pulumi new wizard.
const config = new pulumi.Config();

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
const image = new dockerBuild.Image("image", {
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
    // Build multi-platforms
    platforms: [
        dockerBuild.Platform.Linux_amd64,
        // add more as needed
    ],
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
