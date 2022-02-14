import * as gcloud from "@pulumi/google-native";
import * as config from "./config";

export const dockerRegistry = new gcloud.artifactregistry.v1.Repository("registry", {
    project: config.project,
    location: "us",
    format: gcloud.artifactregistry.v1.RepositoryFormat.Docker,
    repositoryId: config.artifactRegistryDockerRepositoryId,
});
