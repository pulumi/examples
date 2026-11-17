[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-software-factory-delivery/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-software-factory-delivery/README.md#gh-dark-mode-only)

# Deliver the agent software factory with a Pulumi Delivery pipeline

This example replaces a manual bring-up script with a Pulumi Delivery pipeline. The pipeline deploys five stacks in order: a model on GPUs, a platform base, and three services. Pulumi Cloud runs each stage, so the work no longer depends on one laptop and one AWS session.

It creates:

- A **pipeline** named `software-factory`, which Pulumi Cloud runs when the repository changes.
- A **cluster stage** for the `llm` stack. It sits behind an approval gate, because the GPU cluster costs about $2.20 per hour.
- A **platform stage** for the shared `platform` stack.
- A **services stage** that updates the `factory`, `agent` and `triage` stacks side by side.
- **Bootstrap and verify jobs** that run after the services stage, and a **seed job** behind a manual gate.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
1. A Pulumi Cloud plan that includes Delivery and approval gates. Approval gates require Pro or Enterprise.
1. The five target stacks (`llm`, `platform`, `factory`, `agent`, `triage`) must already exist. Delivery updates stacks, but it doesn't create them.

## Deploying the example

1. Create a new stack for the pipeline:

    ```bash
    pulumi stack init my-org/software-factory-delivery/main
    ```

1. Set the pipeline configuration. Copy the example file, then edit the values:

    ```bash
    cp Pulumi.main.yaml.example Pulumi.main.yaml
    ```

    Set `org`, `owner`, `repository` and `branch` to your own values. The `owner` tag is required.

1. Register the package and install dependencies:

    ```bash
    pulumi package add delivery
    npm install
    ```

1. Register the pipeline. The command exits with code 10. That is expected, because the stages wait for a run:

    ```bash
    pulumi up
    ```

1. Push the repository to the branch that the pipeline deploys. Pulumi Cloud starts a run on each push that changes the pipeline's paths.

1. Approve the cluster stage when Pulumi Cloud asks. Review the preview first.

## Cleaning up

The pipeline only brings the factory up. To tear it down, run the teardown from the factory repository, then remove the pipeline stack:

```bash
pulumi stack rm my-org/software-factory-delivery/main
```

## Summary

Each stage is a retry boundary. A failed `triage` update does not rerun the 45-minute GPU bring-up in the cluster stage. The services stage updates `factory`, `agent` and `triage` in parallel, because each one references `platform` and `triage` also references `llm`.

The `approval()` gate on the cluster stage shows an approver a preview of the `llm` update before anyone clicks through. A routine push shows no change to `llm`. A change that replaces the GPU node group is visible before it happens.

## Before this runs

This example expects a few things from the environment:

- **The source repository.** The jobs run scripts from the factory repository (`scripts/`, `examples/` and `factory-prompt.md`). Use the same repository layout, or change the jobs.
- **AWS credentials.** The target stacks read AWS credentials from an [ESC environment](https://www.pulumi.com/docs/esc/) built on `fn::open::aws-login`. Import that environment in each target stack's configuration file. The pipeline's service principal must be allowed to open it.
- **Secrets.** Secret values such as `hfToken` and `jevApiKey` can't be set through the pipeline configuration. Put them in an ESC environment that the target stack imports.
- **A reachable cluster.** The bootstrap, verify and seed jobs use `kubectl` against the EKS API endpoint. If the endpoint is private, those jobs can't run on a Pulumi-managed runner.
