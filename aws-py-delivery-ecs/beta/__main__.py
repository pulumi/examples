# Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import pulumi
import pulumi_aws as aws
import pulumi_awsx as awsx

# Set by the pipeline: the image the build stage pushed, pinned by digest.
image_ref = pulumi.Config().require("imageRef")

cluster = aws.ecs.Cluster("cluster")

# A public load balancer in the default VPC that forwards port 80 to the
# app's port 8080.
lb = awsx.lb.ApplicationLoadBalancer(
    "lb",
    default_target_group=awsx.lb.TargetGroupArgs(
        port=8080,
        protocol="HTTP",
        target_type="ip",
        health_check=aws.lb.TargetGroupHealthCheckArgs(path="/", interval=10, healthy_threshold=2),
        deregistration_delay=10,
    ),
)

service = awsx.ecs.FargateService(
    "app",
    cluster=cluster.arn,
    assign_public_ip=True,
    desired_count=1,
    task_definition_args=awsx.ecs.FargateServiceTaskDefinitionArgs(
        container=awsx.ecs.TaskDefinitionContainerDefinitionArgs(
            name="app",
            image=image_ref,
            cpu=256,
            memory=512,
            essential=True,
            port_mappings=[
                awsx.ecs.TaskDefinitionPortMappingArgs(
                    container_port=8080,
                    target_group=lb.default_target_group,
                )
            ],
        ),
    ),
)

pulumi.export("url", lb.load_balancer.dns_name.apply(lambda dns: f"http://{dns}"))
