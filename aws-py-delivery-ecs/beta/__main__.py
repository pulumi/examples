# Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import pulumi
import pulumi_aws as aws
import pulumi_awsx as awsx

# Set by the pipeline: the image the build stage pushed, pinned by digest.
image_ref = pulumi.Config().require("imageRef")

cluster = aws.ecs.Cluster("cluster")

# The app's tasks run in the default VPC's public subnets, next to the load
# balancer.
vpc = awsx.ec2.DefaultVpc("vpc")

# A public load balancer in the default VPC, listening on port 80. The service
# adds a rule to its listener that forwards requests to the app's port 8080.
lb = awsx.lb.ApplicationLoadBalancer("lb")

task_definition = awsx.ecs.TaskDefinition(
    "app",
    containers={
        "app": awsx.ecs.ContainerDefinitionArgs(
            image=image_ref,
            cpu_units=256,
            memory_mi_b=512,
            essential=True,
            port_mappings=[awsx.ecs.AwsvpcPortMappingArgs(container_port=8080)],
        ),
    },
)

service = awsx.ecs.Service(
    "app",
    cluster_arn=cluster.arn,
    task_definition_arn=task_definition.task_definition_arn,
    vpc_subnet_ids=vpc.public_subnet_ids,
    assign_public_ip=True,
    desired_count=1,
    load_balancer_attachments={
        "app": awsx.ecs.ServiceLoadBalancerAttachmentArgs(
            application=awsx.ecs.ApplicationLoadBalancerAttachmentArgs(
                container_name="app",
                container_port=8080,
                listener_arn=lb.listeners.apply(lambda listeners: listeners[0].arn),
                priority=10,
                target_health_check=awsx.ecs.TargetGroupHealthCheckArgs(
                    path="/", interval_seconds=10, healthy_threshold=2
                ),
            ),
        ),
    },
)

pulumi.export("url", lb.load_balancer.dns_name.apply(lambda dns: f"http://{dns}"))
