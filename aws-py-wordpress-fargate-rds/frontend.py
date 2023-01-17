import json

import pulumi_aws as aws
from pulumi import ComponentResource, Output, ResourceOptions


class WebServiceArgs:

    def __init__(self,
                 db_host=None,
                 db_port=None,
                 db_name=None,
                 db_user=None,
                 db_password=None,
                 vpc_id=None,
                 subnet_ids=None,  # array of subnet IDs
                 security_group_ids=None):  # array of security group Ids

        self.db_host = db_host
        self.db_port = db_port
        self.db_name = db_name
        self.db_user = db_user
        self.db_password = db_password
        self.vpc_id = vpc_id
        self.subnet_ids = subnet_ids
        self.security_group_ids = security_group_ids


class WebService(ComponentResource):

    def __init__(self,
                 name: str,
                 args: WebServiceArgs,
                 opts: ResourceOptions = None):

        super().__init__('custom:resource:Frontend', name, {}, opts)

        # Create an ECS cluster to run a container-based service.
        self.cluster = aws.ecs.Cluster(f'{name}-ecs',
            opts=ResourceOptions(parent=self)
            )

        # Create a load balancer to listen for HTTP traffic on port 80.
        self.alb = aws.lb.LoadBalancer(f'{name}-alb',
            security_groups=args.security_group_ids,
            subnets=args.subnet_ids,
            opts=ResourceOptions(parent=self)
            )

        atg = aws.lb.TargetGroup(f'{name}-app-tg',
            port=80,
            protocol='HTTP',
            target_type='ip',
            vpc_id=args.vpc_id,
            health_check=aws.lb.TargetGroupHealthCheckArgs(
                healthy_threshold=2,
                interval=5,
                timeout=4,
                protocol='HTTP',
                matcher='200-399'
            ),
            opts=ResourceOptions(parent=self)
            )

        wl = aws.lb.Listener(f'{name}-listener',
            load_balancer_arn=self.alb.arn,
            port=80,
            default_actions=[aws.lb.ListenerDefaultActionArgs(
                type='forward',
                target_group_arn=atg.arn,
            )],
            opts=ResourceOptions(parent=self)
            )

        # Create an IAM role that can be used by our service's task.
        role = aws.iam.Role(f'{name}-task-role',
            assume_role_policy=json.dumps({
                'Version': '2008-10-17',
                'Statement': [{
                    'Sid': '',
                    'Effect': 'Allow',
                    'Principal': {
                        'Service': 'ecs-tasks.amazonaws.com'
                    },
                    'Action': 'sts:AssumeRole',
                }]
            }),
            opts=ResourceOptions(parent=self)
            )

        rpa = aws.iam.RolePolicyAttachment(f'{name}-task-policy',
            role=role.name,
            policy_arn='arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
            opts=ResourceOptions(parent=self))

        # Spin up a load balanced service running our container image.
        task_name = f'{name}-app-task'
        container_name = f'{name}-app-container'
        self.task_definition=aws.ecs.TaskDefinition(task_name,
            family='fargate-task-definition',
            cpu='256',
            memory='512',
            network_mode='awsvpc',
            requires_compatibilities=[
                'FARGATE'],
            execution_role_arn=role.arn,
            container_definitions=Output.json_dumps([{
                'name': container_name,
                'image': 'wordpress',
                'portMappings': [{
                    'containerPort': 80,
                    'hostPort': 80,
                    'protocol': 'tcp'
                }],
                'environment': [
                    {
                        'name': 'WORDPRESS_DB_HOST',
                        'value': Output.format("{0}:{1}", args.db_host, args.db_port)
                    },
                    {
                        'name': 'WORDPRESS_DB_NAME',
                        'value': args.db_name
                    },
                    {
                        'name': 'WORDPRESS_DB_USER',
                        'value': args.db_user
                    },
                    {
                        'name': 'WORDPRESS_DB_PASSWORD',
                        'value': args.db_password
                    },
                ]
            }]),
            opts=ResourceOptions(parent=self)
        )

        self.service = aws.ecs.Service(f'{name}-app-svc',
            cluster=self.cluster.arn,
            desired_count=1,
            launch_type='FARGATE',
            task_definition=self.task_definition.arn,
            network_configuration=aws.ecs.ServiceNetworkConfigurationArgs(
                assign_public_ip=True,
                subnets=args.subnet_ids,
                security_groups=args.security_group_ids
            ),
            load_balancers=[aws.ecs.ServiceLoadBalancerArgs(
                target_group_arn=atg.arn,
                container_name=container_name,
                container_port=80,
            )],
            opts=ResourceOptions(
                depends_on=[wl], parent=self),
            )

        self.register_outputs({})
