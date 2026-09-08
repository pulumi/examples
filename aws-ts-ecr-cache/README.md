[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-ecr-cache/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-ecr-cache/README.md#gh-dark-mode-only)

# AWS ECR pull-through cache with Pulumi

This Pulumi project creates AWS Elastic Container Registry (ECR) repositories with pull-through cache rules for Docker Hub, GitHub Container Registry, and GitLab Container Registry. It also sets up AWS Secrets Manager secrets to store credentials for Docker Hub, GitHub, and GitLab.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region <your-aws-region>
    ```

1.  Configure credentials for each registry you want to cache. Each registry is optional; a cache rule is created only for the registries whose username is set.

    Docker Hub — to get your access token, log in to Docker Hub, navigate to [Account Settings](https://hub.docker.com/settings/security), and create a new access token:

    ```bash
    pulumi config set dockerHubUsername <your-docker-hub-username>
    pulumi config set --secret dockerHubAccessToken <your-docker-hub-access-token>
    ```

    GitHub — to get your access token, log in to GitHub, navigate to [Developer settings](https://github.com/settings/tokens), and create a new personal access token with the `read:packages` scope:

    ```bash
    pulumi config set gitHubUsername <your-github-username>
    pulumi config set --secret gitHubAccessToken <your-github-access-token>
    ```

    GitLab — to get your access token, log in to GitLab, navigate to [Access Tokens](https://gitlab.com/-/profile/personal_access_tokens), and create a new personal access token with the `read_registry` scope:

    ```bash
    pulumi config set gitLabUsername <your-gitlab-username>
    pulumi config set --secret gitLabAccessToken <your-gitlab-access-token>
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

### Resources created

- **ECR Repositories**:
  - `pullThroughCacheECR`: ECR repository for pull-through cache.

- **Pull-Through Cache Rules**:
  - `dockerHubCacheRule`: Pull-through cache rule for Docker Hub (if `dockerHubUsername` is set).
  - `githubCacheRule`: Pull-through cache rule for GitHub Container Registry (if `gitHubUsername` is set).
  - `gitLabCacheRule`: Pull-through cache rule for GitLab Container Registry (if `gitLabUsername` is set).

- **Secrets Manager Secrets**:
  - `ecrPullThroughCacheDockerHubSecret`: Secret for Docker Hub credentials (if `dockerHubUsername` is set).
  - `ecrPullThroughCacheGitHubSecret`: Secret for GitHub credentials (if `gitHubUsername` is set).
  - `ecrPullThroughCacheGitLabSecret`: Secret for GitLab credentials (if `gitLabUsername` is set).

### Outputs

- `pullThroughCacheECRRepositoryUrl`: URL of the ECR repository.
- `ecrRepositoryPrefixes`: Prefixes for the ECR repositories.

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it to avoid incurring further charges:

```bash
pulumi destroy
pulumi stack rm
```
