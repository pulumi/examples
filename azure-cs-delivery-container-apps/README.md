# Container App pipeline with Pulumi Delivery on Azure

This example uses Pulumi Delivery to build a container image on every push, push it to Azure Container Registry, deploy it to an Azure Container App in a beta stage, and check that the app answers. The image is built once: the beta stage deploys the exact image the build stage pushed, by digest, so every commit gets a new Container App revision.

The example has three Pulumi projects, all in C#:

- [`pipeline/`](pipeline) defines the Delivery pipeline: a GitHub source, a `build` stage and a `beta` stage.
- [`image/`](image) creates a container registry, then builds the app in [`app/`](app) and pushes its image.
- [`beta/`](beta) deploys that image to an Azure Container App and exports the app's URL.

Every stack authenticates to Azure through Pulumi ESC with OIDC, so no long-lived Azure credentials are stored anywhere.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/), version 3.277.0 or later
1. [Install .NET](https://www.pulumi.com/docs/intro/languages/dotnet/), version 8 or later
1. A Pulumi Cloud organization with Pulumi Delivery available
1. An Azure subscription with the `Microsoft.App` and `Microsoft.ContainerRegistry` [resource providers registered](https://learn.microsoft.com/azure/azure-resource-manager/management/resource-providers-and-types#register-resource-provider)
1. A GitHub repository that holds this example, for example a fork of `pulumi/examples`

## Setting up the pipeline

Run the commands below in order, in one shell, starting in this example's directory.

1. Give Pulumi Cloud access to your repository. Install the [Pulumi GitHub App](https://www.pulumi.com/docs/integrations/version-control/github-app/) on your GitHub organization if it isn't installed yet, then check that it can read the repository that holds this example: in Pulumi Cloud, go to **Settings** > **Version control**, open the GitHub installation, choose **Configure repository access**, and add the repository on GitHub.

1. Create an ESC environment that logs in to Azure with OIDC. Follow [Configuring OIDC for Azure](https://www.pulumi.com/docs/esc/integrations/dynamic-login-credentials/azure-login/), then expose the credentials to the programs:

    ```yaml
    values:
      azure:
        login:
          fn::open::azure-login:
            clientId: <client-id>
            tenantId: <tenant-id>
            subscriptionId: <subscription-id>
            oidc: true
            subjectAttributes:
              - currentEnvironment.name
      environmentVariables:
        ARM_USE_OIDC: 'true'
        ARM_CLIENT_ID: ${azure.login.clientId}
        ARM_TENANT_ID: ${azure.login.tenantId}
        ARM_OIDC_TOKEN: ${azure.login.oidc.token}
        ARM_SUBSCRIPTION_ID: ${azure.login.subscriptionId}
    ```

    The application needs to create resource groups, container registries and Container Apps in the subscription, for example through the Contributor role.

1. Create the image and beta stacks, import the environment into each one, and set the Azure region. Delivery only updates stacks that already exist.

    The project names in the three `Pulumi.yaml` files and the stack references in `pipeline/Program.cs` are fixed. A second deployment in the same Pulumi organization must change them first, or it fails with a 409 "already exists" error. Use your names in the commands below.

    ```bash
    cd image
    pulumi stack init <org>/azure-cs-delivery-container-apps-image/image
    pulumi config env add <project>/<environment> --yes
    pulumi config set azure-native:location westus2
    cd ../beta
    pulumi stack init <org>/azure-cs-delivery-container-apps-beta/beta
    pulumi config env add <project>/<environment> --yes
    pulumi config set azure-native:location westus2
    cd ..
    ```

1. Commit the two stack files. Delivery runs every program from your repository, so each stack's `Pulumi.<stack>.yaml` must be in git. In a fork of `pulumi/examples`, these files are ignored, so add them with `-f`:

    ```bash
    git add -f image/Pulumi.image.yaml beta/Pulumi.beta.yaml
    git commit -m "Add stack files for the Delivery example"
    git push
    ```

1. Create the pipeline stack, point it at your repository, and tell Delivery where the pipeline program lives, then commit and push everything:

    ```bash
    cd pipeline
    pulumi stack init <org>/azure-cs-delivery-container-apps-pipeline/pipeline
    pulumi config set repository <owner>/<name>
    pulumi config set branch <branch>
    pulumi config set path <path>
    pulumi config set --path 'delivery:source.url' https://github.com/<owner>/<name>
    pulumi config set --path 'delivery:source.branch' <branch>
    pulumi config set --path 'delivery:source.directory' <path>/pipeline
    git add -f Pulumi.pipeline.yaml
    git commit -m "Point the Delivery pipeline at this repository"
    git push
    cd ..
    ```

    `repository` is your repository, as `<owner>/<name>`, and `branch` is the branch to watch. `path` is this example's directory within the repository, for example `azure-cs-delivery-container-apps`. The example must live in a subdirectory: the pipeline starts runs for pushes that match `<path>/**`. With the example at the repository root (`path` of `.`), pushes update the pipeline but start no run.

1. Register the pipeline:

    ```bash
    cd pipeline
    pulumi delivery register
    cd ..
    ```

    A successful registration ends with `Registered the pipeline of <stack>` and a link to the pipeline. Its stages show as awaiting until the first run starts. Registration fails if the checkout has uncommitted changes or the commit is not on the branch in `delivery:source`.

1. Let the pipeline open the ESC environment. Registration creates a [service principal](https://www.pulumi.com/docs/delivery/concepts/identity/), named "Delivery azure-cs-delivery-container-apps-pipeline pipeline", and gives it write access to the pipeline, image and beta stacks. The stacks run as that principal, so it also needs to open the environment they import. In Pulumi Cloud, open the environment, go to **Settings**, then **Access**, choose **Add Principal**, then **Service Principal**, pick the pipeline's service principal and give it **Environment Open**.

    Or from the command line:

    ```bash
    ORG=<org>                    # your Pulumi organization
    ENV_PROJECT=<project>        # the environment you created above
    ENV_NAME=<environment>
    PIPELINE="Delivery azure-cs-delivery-container-apps-pipeline pipeline"

    # Every call here is scoped to the organization.
    org_api() { local op=$1; shift; pulumi api "$op" -F orgName="$ORG" "$@"; }
    # The access calls name the kind of entity in a context object.
    type_wrap() { printf '{"__type":"%s"}' "$1"; }

    # The service principal Delivery generated for the pipeline, by name.
    # Delivery cuts names longer than 64 characters, so a cut-off name also matches.
    LOGIN=$(org_api ListOrganizationMembers -F type=service-principal \
      | jq -r --arg name "$PIPELINE" '.members[].user | select(.servicePrincipalKind == "delivery" and (.name == $name or ((.name | length) == 64 and (.name as $n | $name | startswith($n))))) | .githubLogin')
    [ -n "$LOGIN" ] || { echo "No service principal named: $PIPELINE" >&2; }

    # The built-in permission set that lets a principal open an environment.
    OPEN_ID=$(org_api ListRolesByOrgIDAndUXPurpose -F uxPurpose=set \
      | jq -r '.roles[] | select(.name == "Environment Open") | .id')

    # Let the pipeline open the environment.
    ENV_ID=$(org_api GetEnvironmentMetadata_esc_environments -F projectName=$ENV_PROJECT -F envName=$ENV_NAME \
      | jq -r .id)
    [ -n "$LOGIN" ] && org_api UpdateEntityAssignment -F id=$ENV_ID -F "context=$(type_wrap PermissionExpressionEnvironment)" \
      -F userId=$LOGIN -F permissionSetId=$OPEN_ID
    ```

1. Start the first run: push a change to a file in this example, or choose **Start a run** on the pipeline in Pulumi Cloud, under **Delivery** in your organization. Registration does not start a run.

1. Watch the run in Pulumi Cloud. The `build` stage pushes the image. The `beta` stage deploys it, then the `check-url` job requests the app's URL and records it as the job's `checked` output. The run also records the URL as the `beta-url` artifact of the release. From now on, every push that changes files in this example starts a new run.

## Cleaning up

From this example's directory, destroy the stacks in reverse order and remove them. Each step runs only if the one before it succeeded:

```bash
(cd pipeline && pulumi destroy && pulumi stack rm) &&
  (cd beta && pulumi destroy && pulumi stack rm) &&
  (cd image && pulumi destroy && pulumi stack rm)
```

Destroying the image stack deletes the container registry and every image in it. Destroying the pipeline stack removes the pipeline's service principal and its access to the environment.

If you created the ESC environment only for this example, remove it with `pulumi env rm <project>/<environment>`, along with any Azure OIDC resources you created for it.

## Learn more

- [Pulumi Delivery](https://www.pulumi.com/docs/delivery/)
- [Pipeline identity in Pulumi Delivery](https://www.pulumi.com/docs/delivery/concepts/identity/)
- [Azure Container Apps](https://learn.microsoft.com/azure/container-apps/)
