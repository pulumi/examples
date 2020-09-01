import json
from pulumi_aws import cloudwatch, sns, dynamodb, ec2, ecr, ecs, iam, kinesis, sqs

## CloudWatch
logins_topic = sns.Topic("myloginstopic")

event_rule = cloudwatch.EventRule(
    "myeventrule",
    event_pattern=json.dumps({
        "detail-type": [
            "AWS Console Sign In via CloudTrail"
        ]
    }))

event_target = cloudwatch.EventTarget(
    "myeventtarget",
    rule=event_rule.name,
    target_id="SendToSNS",
    arn=logins_topic.arn)

log_group=cloudwatch.LogGroup("myloggroup")

log_metric_filter = cloudwatch.LogMetricFilter(
    "mylogmetricfilter",
    pattern="",
    log_group_name=log_group.name,
    metric_transformation=cloudwatch.LogMetricFilterMetricTransformationArgs(
        name="EventCount",
        namespace="YourNamespace",
        value="1",
    ))

log_stream = cloudwatch.LogStream(
    "mylogstream",
    log_group_name=log_group.name)

metric_alart = cloudwatch.MetricAlarm(
    "mymetricalarm",
    comparison_operator="GreaterThanOrEqualToThreshold",
    evaluation_periods=2,
    metric_name="CPUUtilization",
    namespace="AWS/EC2",
    period=120,
    statistic="Average",
    threshold=80,
    alarm_description="This metric monitors ec2 cpu utilization")

## DynamoDB
db = dynamodb.Table(
    "mytable",
    attributes=[dynamodb.TableAttributeArgs(
        name="Id",
        type="S",
    )],
    hash_key="Id",
    read_capacity=1,
    write_capacity=1)

## EC2
eip = ec2.Eip("myeip")

security_group = ec2.SecurityGroup(
    "mysecuritygroup",
    ingress=[ec2.SecurityGroupIngressArgs(
        protocol="tcp",
        from_port=80,
        to_port=80,
        cidr_blocks=["0.0.0.0/0"]
    )])

vpc = ec2.Vpc(
    "myvpc",
    cidr_block="10.0.0.0/16")

igw = ec2.InternetGateway(
    "myinternetgateway",
    vpc_id=vpc.id)

public_route_table = ec2.RouteTable(
    "myroutetable",
    routes=[ec2.RouteTableRouteArgs(
        cidr_block="0.0.0.0/0",
        gateway_id=igw.id
    )],
    vpc_id=vpc.id)

## ECR

repository = ecr.Repository("myrepository")

repository_policy = ecr.RepositoryPolicy(
    "myrepositorypolicy",
    repository=repository.id,
    policy=json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Sid": "new policy",
            "Effect": "Allow",
            "Principal": "*",
            "Action": [
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "ecr:BatchCheckLayerAvailability",
                "ecr:PutImage",
                "ecr:InitiateLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:CompleteLayerUpload",
                "ecr:DescribeRepositories",
                "ecr:GetRepositoryPolicy",
                "ecr:ListImages",
                "ecr:DeleteRepository",
                "ecr:BatchDeleteImage",
                "ecr:SetRepositoryPolicy",
                "ecr:DeleteRepositoryPolicy",
            ]
        }]
    })
)

lifecycle_policy = ecr.LifecyclePolicy(
    "mylifecyclepolicy",
    repository=repository.id,
    policy=json.dumps({
        "rules": [{
            "rulePriority": 1,
            "description": "Expire images older than 14 days",
            "selection": {
                "tagStatus": "untagged",
                "countType": "sinceImagePushed",
                "countUnit": "days",
                "countNumber": 14
            },
            "action": {
                "type": "expire"
            }
        }]
    })
)

## ECS

cluster = ecs.Cluster("mycluster")

role = iam.Role(
    "myrole",
    assume_role_policy=json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Action": "sts:AssumeRole",
            "Principal": {
                "Service": "ec2.amazonaws.com"
            },
            "Effect": "Allow",
            "Sid": ""
        }]
    }))

role_policy = iam.RolePolicy(
    "myrolepolicy",
    role=role.id,
    policy=json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Action": ["ec2:Describe*"],
            "Effect": "Allow",
            "Resource": "*"
        }]
    }))

policy = iam.Policy(
    "mypolicy",
    policy=json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Action": ["ec2:Describe*"],
            "Effect": "Allow",
            "Resource": "*"
        }]
    }))

role_policy_attachment = iam.RolePolicyAttachment(
    "myrolepolicyattachment",
    role=role.id,
    policy_arn=policy.arn)

user = iam.User("myuser")

group = iam.Group("mygroup")

## Kinesis
stream = kinesis.Stream(
    "mystream",
    shard_count=1)

## SQS
queue = sqs.Queue("myqueue")

## SNS
topic = sns.Topic("mytopic")

topic_subscription = sns.TopicSubscription(
    "mytopicsubscription",
    topic=topic.arn,
    protocol="sqs",
    endpoint=queue.arn)
