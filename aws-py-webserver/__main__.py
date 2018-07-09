# Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import pulumi
from pulumi_aws import ec2
from ami import get_linux_ami

size = 't2.micro'

group = ec2.SecurityGroup('web-secgrp',
    description='Enable HTTP access',
    ingress=[
        { 'protocol': 'tcp', 'from_port': 80, 'to_port': 80, 'cidr_blocks': ['0.0.0.0/0'] }
    ])

user_data = """
#!/bin/bash
echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &
"""

server = ec2.Instance('web-server-www',
    instance_type=size,
    security_groups=[group.name],
    user_data=user_data,
    ami=get_linux_ami(size))

pulumi.output('public_ip', server.public_ip)
pulumi.output('public_dns', server.public_dns)
