# Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import pulumi
import pulumi_delivery as delivery

config = pulumi.Config()
repository = config.require("repository")
branch = config.require("branch")
path = config.require("path")

org = pulumi.get_organization()


def string_outputs(outputs, entry, *keys):
    """Picks the named outputs of one Stacks entry that are strings.

    Stack outputs are empty until that stack has run once, so a missing value
    is left out rather than passed on as the string "None".
    """
    values = (outputs or {}).get(entry) or {}
    return {key: values[key] for key in keys if isinstance(values.get(key), str)}


# Run the pipeline on every push that touches this example.
code = delivery.GitHubSource(
    "code",
    repository=repository,
    branch=branch,
    trigger=delivery.SourceTriggerArgs(paths=[f"{path}/**"]),
)

# Where Delivery reads this program from is set by `delivery:source` in the
# pipeline stack's config. A push there updates the pipeline.
pipeline = delivery.Pipeline("pipeline")

# Build stage: create the ECR repository, build the image and push it, tagged
# with the commit.
build = delivery.Stage("build", pipeline=pipeline)
image_stacks = delivery.Stacks(
    "image",
    stage=build,
    stacks={
        "image": delivery.StacksEntryArgs(
            stack=f"{org}/aws-py-delivery-ecs-image/image",
            source=code,
            directory=f"{path}/image",
            config={"commit": code.commit},
        ),
    },
)

# Beta stage: run that exact image, by digest, on ECS Fargate, then check
# that the service answers through its load balancer.
beta = delivery.Stage("beta", pipeline=pipeline, from_=[build])
beta_stacks = delivery.Stacks(
    "beta",
    stage=beta,
    stacks={
        "beta": delivery.StacksEntryArgs(
            stack=f"{org}/aws-py-delivery-ecs-beta/beta",
            source=code,
            directory=f"{path}/beta",
            config=image_stacks.outputs.apply(lambda o: string_outputs(o, "image", "imageRef")),
        ),
    },
)

delivery.Job(
    "check-url",
    stage=beta,
    source=code,
    directory=f"{path}/pipeline",
    command="./check-url.sh",
    environment=beta_stacks.outputs.apply(
        lambda o: (
            {"SERVICE_URL": url} if (url := string_outputs(o, "beta", "url").get("url")) else {}
        )
    ),
    # A Job starts with the stage, alongside the stage's stacks. Wait for the
    # beta stack so the service exists before the check runs.
    opts=pulumi.ResourceOptions(depends_on=[beta_stacks]),
)

# Record the app's URL as the `beta-url` artifact of the release.
delivery.Artifact(
    "beta-url",
    stage=beta,
    value=beta_stacks.outputs.apply(lambda o: string_outputs(o, "beta", "url").get("url")),
)
