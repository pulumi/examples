# Container delivery to Amazon ECS with Pulumi Delivery, in Python

This example uses [Pulumi Delivery](https://www.pulumi.com/docs/delivery/) to take a container image from a git push to a running beta environment on AWS. Every push that touches this directory starts a pipeline run:

1. The **build** stage runs the `image` stack. It creates an Amazon ECR repository, builds the app in `app/` with [Docker Build](https://www.pulumi.com/registry/packages/docker-build/), tags the image with the commit and pushes it.
2. The **beta** stage runs the `beta` stack with the image's digest reference, so it deploys exactly the image the build stage pushed. The stack runs the image as an ECS Fargate service behind an Application Load Balancer, using [AWSX](https://www.pulumi.com/registry/packages/awsx/). A job then calls the load balancer URL until the app answers.

The example has three Pulumi projects, all in Python, including the pipeline itself:

- [`pipeline/`](pipeline) defines the Delivery pipeline: a GitHub source, a `build` stage and a `beta` stage.
- [`image/`](image) creates an ECR repository, then builds the app in [`app/`](app) and pushes its image.
- [`beta/`](beta) runs that image as an ECS Fargate service behind a load balancer and exports its URL.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/install/), version 3.277.0 or later, for `pulumi delivery register`.
1. [Install Python](https://www.pulumi.com/docs/languages-sdks/python/), version 3.10 or later.
1. A Pulumi Cloud organization with Pulumi Delivery enabled.
1. A GitHub repository that holds this example, either a fork of [pulumi/examples](https://github.com/pulumi/examples) or a copy of this directory in a repository of your own. Delivery runs every program from a checkout of that repository.
1. The [Pulumi GitHub App](https://www.pulumi.com/docs/integrations/version-control/github-app/) installed, with access to that repository. In Pulumi Cloud, go to **Settings** > **Version control**, open the GitHub installation, and choose **Configure repository access** to add it on GitHub.
1. An AWS account, and a [Pulumi ESC environment](https://www.pulumi.com/docs/esc/) that logs in to it with [OIDC](https://www.pulumi.com/docs/esc/integrations/dynamic-login-credentials/aws-login/). The steps below call it `<org>/<project>/<aws-env>`.

## Setting up the pipeline

Run the commands below in order, in one shell, starting in this example's directory. They use `<org>` for your Pulumi organization.

1. Create the two stacks that the pipeline updates, and point each at your AWS environment and region. Delivery does not create stacks, so they must exist before the first run.

    The project names in the three `Pulumi.yaml` files and the stack references in `pipeline/__main__.py` are fixed. A second deployment in the same Pulumi organization must change them first, or it fails with a 409 "already exists" error. Use your names in the commands below.

    ```bash
    cd image
    pulumi stack init <org>/aws-py-delivery-ecs-image/image
    pulumi config env add <project>/<aws-env> --yes
    pulumi config set aws:region us-west-2
    cd ../beta
    pulumi stack init <org>/aws-py-delivery-ecs-beta/beta
    pulumi config env add <project>/<aws-env> --yes
    pulumi config set aws:region us-west-2
    cd ..
    ```

1. Commit the two stack files. Delivery runs every program from your repository, so each stack's `Pulumi.<stack>.yaml` must be in git. In a fork of `pulumi/examples`, these files are ignored, so add them with `-f`:

    ```bash
    git add -f image/Pulumi.image.yaml beta/Pulumi.beta.yaml
    git commit -m "Add stack files for the Delivery example"
    git push
    ```

1. Create the pipeline stack, point it at your repository, and tell Delivery where the pipeline program lives, with `delivery:source` in the stack config. `pulumi install` installs the [`pulumi-delivery`](https://pypi.org/project/pulumi-delivery/) package from `requirements.txt` into the virtual environment. Then commit and push everything:

    ```bash
    cd pipeline
    pulumi stack init <org>/aws-py-delivery-ecs-pipeline/pipeline
    pulumi install
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

    `repository` is your repository, as `<owner>/<name>`, and `branch` is the branch to watch. `path` is this example's directory within the repository, for example `aws-py-delivery-ecs`. The example must live in a subdirectory: the pipeline starts runs for pushes that match `<path>/**`. With the example at the repository root (`path` of `.`), pushes update the pipeline but start no run.

1. Register the pipeline:

    ```bash
    cd pipeline
    pulumi delivery register
    cd ..
    ```

    A successful registration ends with `Registered the pipeline of <stack>` and a link to the pipeline. Its stages show as awaiting until the first run starts. Registration fails if the checkout has uncommitted changes or the commit is not on the branch in `delivery:source`.

1. Let the pipeline open the ESC environment. Registration creates a [service principal](https://www.pulumi.com/docs/delivery/concepts/identity/), named "Delivery aws-py-delivery-ecs-pipeline pipeline", and gives it write access to the pipeline, image and beta stacks. The stacks run as that principal, so it also needs to open the environment they import. In Pulumi Cloud, open the environment, go to **Settings**, then **Access**, choose **Add Principal**, then **Service Principal**, pick the pipeline's service principal and give it **Environment Open**.

    Or from the command line:

    ```bash
    ./scripts/pulumi-env-access-grant <project>/<aws-env> --principal "Delivery aws-py-delivery-ecs-pipeline pipeline" --by-name --permission open
    ```

1. Start the first run: push a change to a file in this example, for example to the response text in `app/app.py`, or choose **Start a run** on the pipeline in Pulumi Cloud, under **Delivery** in your organization. Registration does not start a run.

1. Watch the run in Pulumi Cloud. The `build` stage pushes the image. The `beta` stage deploys it, then the `check-url` job requests the load balancer URL until the app answers and records the URL and status as the job's outputs. The run also records the URL as the `beta-url` artifact of the release. The first run can take several minutes, mostly for the load balancer and the first Fargate task. From now on, every push that changes files in this example starts a new run.

## Cleaning up

From this example's directory, destroy the stacks in reverse order and remove them. Each step runs only if the one before it succeeded:

```bash
(cd pipeline && pulumi destroy && pulumi stack rm) &&
  (cd beta && pulumi destroy && pulumi stack rm) &&
  (cd image && pulumi destroy && pulumi stack rm)
```

Destroying the image stack deletes the ECR repository and every image in it. Destroying the pipeline stack removes the pipeline's service principal and its access to the environment.

If you created the AWS environment only for this example, remove it with `pulumi env rm <project>/<aws-env>`, along with any AWS OIDC resources you created for it.

## Learn more

- [Pulumi Delivery](https://www.pulumi.com/docs/delivery/)
- [Pipeline identity in Pulumi Delivery](https://www.pulumi.com/docs/delivery/concepts/identity/)
- [Amazon ECS](https://docs.aws.amazon.com/ecs/)
