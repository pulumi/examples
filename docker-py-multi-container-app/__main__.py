"""A Python Pulumi program"""

import pulumi
import pulumi_docker as docker


redis_port = 6379
redis_host = "redisdb"

network = docker.Network("network",
                        name="services")

redis_image = docker.RemoteImage("redis_image",
                        name="redis:6.2",
                        keep_locally=True)

redis_container = docker.Container("redis_container",
                        image=redis_image.latest,
                        ports=[docker.ContainerPortArgs(internal=redis_port, external=redis_port)],
                        networks_advanced=[docker.ContainerNetworksAdvancedArgs(
                            name=network.name,
                            aliases=[redis_host]
                        )]
)

app_image = docker.Image("app_image",
                        build=docker.DockerBuild(context="./app"),
                        image_name="app",
                        skip_push=True
)

app_port = 5000

app_container = docker.Container("app_container",
                        image=app_image.base_image_name,
                        ports=[docker.ContainerPortArgs(internal=app_port, external=app_port)],
                        envs=[
                            f"REDIS_HOST={redis_host}",
                            f"REDIS_PORT={redis_port}"
                        ],
                        networks_advanced=[docker.ContainerNetworksAdvancedArgs(
                            name=network.name
                        )],
                        opts=pulumi.ResourceOptions(depends_on=[redis_container])
)

pulumi.export("url", f"http://localhost:{app_port}")