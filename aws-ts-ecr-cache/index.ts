// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const pulumiConfig = new pulumi.Config();
const dockerHubUsername = pulumiConfig.get("dockerHubUsername");
const gitHubUsername = pulumiConfig.get("gitHubUsername");
const gitLabUsername = pulumiConfig.get("gitLabUsername");

// Create an ECR repository for Docker Hub
const pullThroughCacheEcr = new aws.ecr.Repository("pullThroughCacheECR", {
  name: "pull-through-cache-ecr",
});

if (dockerHubUsername) {
  // Create an AWS Secrets Manager secret for Docker Hub
  const ecrPullThroughCacheDockerHubSecret = new aws.secretsmanager.Secret("ecrPullThroughCacheDockerHubSecret", {
    name: "ecr-pullthroughcache/dockerHubSecret",
    recoveryWindowInDays: 0,
  });

  const dockerHubSecretVersion = new aws.secretsmanager.SecretVersion("dockerHubSecretValue", {
    secretId: ecrPullThroughCacheDockerHubSecret.id,
    secretString: JSON.stringify({
      username: pulumiConfig.require("dockerHubUsername"),
      accessToken: pulumiConfig.requireSecret("dockerHubAccessToken"),
    }),
  });

  // Create a pull-through cache rule for Docker Hub
  const dockerHubCacheRule = new aws.ecr.PullThroughCacheRule("dockerHubCacheRule", {
    ecrRepositoryPrefix: "docker-hub",
    upstreamRegistryUrl: "registry-1.docker.io",
    credentialArn: ecrPullThroughCacheDockerHubSecret.arn,
  }, { dependsOn: [pullThroughCacheEcr] });
}

// Create a pull-through cache rule for Kubernetes registry
const k8sCacheRule = new aws.ecr.PullThroughCacheRule("k8sCacheRule", {
  ecrRepositoryPrefix: "k8si0",
  upstreamRegistryUrl: "registry.k8s.io",
}, { dependsOn: [pullThroughCacheEcr] });

if (gitHubUsername) {
  // Create an AWS Secrets Manager secret for GitHub
  const ecrPullThroughCacheGitHubSecret = new aws.secretsmanager.Secret("ecrPullThroughCacheGitHubSecret", {
    name: "ecr-pullthroughcache/githubSecret",
    recoveryWindowInDays: 0,
  });

  const gitHubSecretVersion = new aws.secretsmanager.SecretVersion("gitHubSecretValue", {
    secretId: ecrPullThroughCacheGitHubSecret.id,
    secretString: JSON.stringify({
      username: pulumiConfig.require("gitHubUsername"),
      accessToken: pulumiConfig.requireSecret("gitHubAccessToken"),
    }),
  });

  // Create a pull-through cache rule for GitHub Container Registry
  const githubCacheRule = new aws.ecr.PullThroughCacheRule("githubCacheRule", {
    ecrRepositoryPrefix: "github",
    upstreamRegistryUrl: "ghcr.io",
    credentialArn: ecrPullThroughCacheGitHubSecret.arn,
  }, { dependsOn: [pullThroughCacheEcr] });
}

if (gitLabUsername) {
  // Create an AWS Secrets Manager secret for GitLab
  const ecrPullThroughCacheGitLabSecret = new aws.secretsmanager.Secret("ecrPullThroughCacheGitLabSecret", {
    name: "ecr-pullthroughcache/gitLabSecret",
    recoveryWindowInDays: 0,
  });

  const gitLabSecretVersion = new aws.secretsmanager.SecretVersion("gitLabSecretValue", {
    secretId: ecrPullThroughCacheGitLabSecret.id,
    secretString: JSON.stringify({
      username: pulumiConfig.require("gitLabUsername"),
      accessToken: pulumiConfig.requireSecret("gitLabAccessToken"),
    }),
  });

  // Create a pull-through cache rule for GitLab Container Registry
  const gitLabCacheRule = new aws.ecr.PullThroughCacheRule("gitLabCacheRule", {
    ecrRepositoryPrefix: "gitlab",
    upstreamRegistryUrl: "registry.gitlab.com",
    credentialArn: ecrPullThroughCacheGitLabSecret.arn,
  }, { dependsOn: [pullThroughCacheEcr] });
}

// Export repository URLs
export const pullThroughCacheECRRepositoryUrl = pullThroughCacheEcr.repositoryUrl;
export const ecrRepositoryPrefixes = {
  dockerHub: dockerHubUsername ? "docker-hub" : undefined,
  k8s: k8sCacheRule.ecrRepositoryPrefix,
  github: gitHubUsername ? "github" : undefined,
  gitlab: gitLabUsername ? "gitlab" : undefined,
};
