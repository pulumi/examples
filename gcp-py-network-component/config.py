import os
import pulumi

config = pulumi.Config()

project = config.get('project')
if project is None:
    project = 'demo'

owner = config.get('owner')
if owner is None:
    owner = os.environ['USER']

subnet_cidr_blocks = config.require_object('subnet_cidr_blocks')

nginx_install_script = """#!/bin/bash
        apt-get -y update
        apt-get -y install nginx
        echo "Powered by Pulumi!" > /var/www/html/index.html
        """
