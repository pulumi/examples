# AWS ECR Pull-Through Cache with Pulumi

[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-ecr-cache/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-ecr-cache/README.md#gh-dark-mode-only)

This Pulumi project creates AWS Elastic Container Registry (ECR) repositories with pull-through cache rules for Docker Hub, GitHub Container Registry, and GitLab Container Registry. It also sets up AWS Secrets Manager secrets to store credentials for Docker Hub, GitHub, and GitLab.

## Prerequisites

- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- [Node.js](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/)
- AWS account and credentials configured

## Project Structure

- `index.ts`: The main Pulumi program that defines the infrastructure.
- `Pulumi.yaml`: The Pulumi project configuration file.
- `tsconfig.json`: TypeScript configuration file.
- `package.json`: Node.js project configuration file.
- `.gitignore`: Git ignore file.

## Setup

1. Install dependencies:

    ```sh
    yarn install
    ```

2. Configure Pulumi stack:

    ```sh
    pulumi config set aws:region <your-aws-region>
    ```

   ### Docker Hub

    > **Note**: To get your Docker Hub access token, log in to Docker Hub, navigate to [Account Settings](https://hub.docker.com/settings/security), and create a new access token.

    ```sh
    pulumi config set dockerHubUsername <your-docker-hub-username>
    pulumi config set --secret dockerHubAccessToken <your-docker-hub-access-token>
    ```

   ### GitHub

    > **Note**: To get your GitHub access token, log in to GitHub, navigate to [Developer settings](https://github.com/settings/tokens), and create a new personal access token with the `read:packages` scope.

    ```sh
    pulumi config set gitHubUsername <your-github-username>
    pulumi config set --secret gitHubAccessToken <your-github-access-token>
    ```

   ### GitLab

    > **Note**: To get your GitLab access token, log in to GitLab, navigate to [Access Tokens](https://gitlab.com/-/profile/personal_access_tokens), and create a new personal access token with the `read_registry` scope.

    ```sh
    pulumi config set gitLabUsername <your-gitlab-username>
    pulumi config set --secret gitLabAccessToken <your-gitlab-access-token>
    ```

3. Deploy the stack:

    ```sh
    pulumi up
    ```

## Resources Created

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

## Outputs

- `pullThroughCacheECRRepositoryUrl`: URL of the ECR repository.
- `ecrRepositoryPrefixes`: Prefixes for the ECR repositories.

## Cleanup

To remove all resources created by this project:

```sh
pulumi destroy
```
