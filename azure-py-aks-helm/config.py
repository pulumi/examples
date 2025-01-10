# Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

"""Configures the example. If password and public key for connecting
to the cluster are not set with `pulumi config`, we generate a random
password and key pair.

"""

from pulumi import Config
from pulumi_random import RandomPassword
from pulumi_tls import PrivateKey


config = Config()


k8s_version = config.get('k8sVersion') or '1.26.3'


password = config.get('password') or RandomPassword('pw',
    length=20, special=True)


generated_key_pair = PrivateKey('ssh-key',
    algorithm='RSA', rsa_bits=4096)


admin_username = config.get('adminUserName') or 'testuser'


ssh_public_key = config.get('sshPublicKey') or \
    generated_key_pair.public_key_openssh


node_count = config.get_int('nodeCount') or 2


node_size = config.get('nodeSize') or 'Standard_D2_v2'
