import pulumi
from pulumi_aws import ec2

group = ec2.SecurityGroup('web-secgrp', ingress=[
    # Uncomment to fail a test:
    #{ "protocol": "tcp", "from_port": 22, "to_port": 22, "cidr_blocks": ["0.0.0.0/0"] },
    { "protocol": "tcp", "from_port": 80, "to_port": 80, "cidr_blocks": ["0.0.0.0/0"] },
])

user_data = '#!/bin/bash echo "Hello, World!" > index.html nohup python -m SimpleHTTPServer 80 &'

server = ec2.Instance('web-server-www;',
    instance_type="t2.micro",
    security_groups=[ group.name ], # reference the group object above
    # Comment out to fail a test:
    tags={'Name': 'webserver'},     # name tag
    ami="ami-c55673a0")             # AMI for us-east-2 (Ohio)
    # Uncomment to fail a test:
    #user_data=user_data)           # start a simple web server
