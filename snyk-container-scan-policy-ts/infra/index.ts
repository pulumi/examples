import * as docker from "@pulumi/docker";

// This image does not have critical issues:
new docker.Image("alpine", {
  imageName: "docker.io/joshkodroff/snyk-policy-alpine",
  buildOnPreview: true,
  build: {
    dockerfile: "AlpineDockerfile",
    platform: "linux/amd64",
  },
  skipPush: true,
});

// This image has critical issues:
new docker.Image("debian", {
  imageName: "docker.io/joshkodroff/snyk-policy-debian",
  buildOnPreview: true,
  build: {
    dockerfile: "DebianDockerfile",
    platform: "linux/amd64",
  },
  skipPush: true,
});

