# Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import pulumi
import pulumi_aws as aws
import pulumi_awsx as awsx
import pulumi_docker_build as docker_build

# Set by the pipeline: the commit being built. The image is tagged with it.
commit = pulumi.Config().require("commit")

repository = awsx.ecr.Repository("app", force_delete=True)

# A short-lived ECR login from the stack's AWS credentials, used to push.
token = aws.ecr.get_authorization_token_output(registry_id=repository.repository.registry_id)

image = docker_build.Image(
    "app",
    context=docker_build.BuildContextArgs(location="../app"),
    # The Delivery runner and ECS Fargate both run x86_64.
    platforms=[docker_build.Platform.LINUX_AMD64],
    tags=[repository.url.apply(lambda url: f"{url}:{commit}")],
    push=True,
    registries=[
        docker_build.RegistryArgs(
            address=repository.url,
            username=token.user_name,
            password=pulumi.Output.secret(token.password),
        )
    ],
)

# The pushed image, pinned by digest. Later stages deploy this exact image.
pulumi.export("imageRef", image.ref)
