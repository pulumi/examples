from pulumi_aws import ec2

group = ec2.SecurityGroup('web-secgrp', ingress=[
    # Uncomment to fail a test:
    # {"protocol": "tcp", "from_port": 22, "to_port": 22, "cidr_blocks": ["0.0.0.0/0"]},
    {"protocol": "tcp", "from_port": 80, "to_port": 80, "cidr_blocks": ["0.0.0.0/0"]},
])

user_data = '#!/bin/bash echo "Hello, World!" > index.html nohup python -m SimpleHTTPServer 80 &'

ami_id = ec2.get_ami(
    most_recent=True,
    owners=["099720109477"],
    filters=[
        ec2.GetAmiFilterArgs(
            name="name",
            values=["ubuntu/images/hvm-ssd/ubuntu-bionic-18.04-amd64-server-*"]
        )]
).id

server = ec2.Instance('web-server-www',
                      instance_type="t2.micro",
                      vpc_security_group_ids=[group.id],  # reference the group object above
                      # Comment out to fail a test:
                      tags={'Name': 'webserver'},  # name tag
                      # Uncomment to fail a test:
                      # user_data=user_data)                # start a simple web server
                      ami=ami_id)
