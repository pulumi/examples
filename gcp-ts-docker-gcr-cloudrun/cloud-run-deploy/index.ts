// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as docker from "@pulumi/docker";

const location = gcp.config.region || "us-central1";

const config = new pulumi.Config();

const configFile = config.require("docker-config-file");

// Default to using ruby-app since that is the name of the image for the example.    
const imageName = config.get("image-name") ?? "ruby-app";

const gcrDockerProvider = new docker.Provider('gcr', {
    registryAuth: [{
        address: "gcr.io",
        configFile: configFile
    }],
});

// Used to get the image from the google cloud registry.  Output is required to make sure that the provider is in sync with this call. 
const registryImage = pulumi.output(
    docker.getRegistryImage({
    name: `gcr.io/${gcp.config.project}/${imageName}:latest`,
}, {provider: gcrDockerProvider}));


// Using the value from the registryImage to pull the image if it's new, pullTriggers looks for a new sha. 
var dockerImage = registryImage.apply(r => new docker.RemoteImage(`${imageName}-docker-image`, {
    name: r.name!,
    pullTriggers: [registryImage.sha256Digest!],
    keepLocally: true
}, {provider: gcrDockerProvider}));

// String used to force the update using the new image. 
var truncatedSha = registryImage.sha256Digest.apply(d => imageName + "-" + d.substr(8,20));

// Deploy to Cloud Run if there is a difference in the sha, denoted above.  
const rubyService = new gcp.cloudrun.Service("ruby", {
    location,
    name: truncatedSha,
    template: {
        spec: {
            containers: [{
                image: dockerImage.name,
            }]
        },
    },
}, {dependsOn: dockerImage});

// Open the service to public unrestricted access
const iamRuby = new gcp.cloudrun.IamMember("ruby-everyone", {
    service: rubyService.name,
    location,
    role: "roles/run.invoker",
    member: "allUsers",
});

export const rubyUrl = rubyService.status.url;

