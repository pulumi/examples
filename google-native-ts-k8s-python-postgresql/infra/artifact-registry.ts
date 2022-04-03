import * as gcloud from "@pulumi/google-native";
import * as random from "@pulumi/random";
import * as config from "./config";

export const dockerRegistryId = new random.RandomPet("dockerRegistryId", {
  length: 2,
}).id;

export const dockerRegistry = new gcloud.artifactregistry.v1.Repository(
  "registry",
  {
    project: config.projectId,
    location: "us",
    format: gcloud.artifactregistry.v1.RepositoryFormat.Docker,
    repositoryId: dockerRegistryId,
  },
  {
    ignoreChanges: ["createTime", "updateTime"],
  }
);
