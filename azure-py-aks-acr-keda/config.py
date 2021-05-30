from pulumi import Config, get_stack, get_project
from pulumi_random import RandomPassword
from pulumi_tls import PrivateKey

config = Config()
project = get_project()
stack = get_stack()
resource_name_prefix = config.get('name_prefix') or project

default_tags = {
    'manager': 'pulumi',
    'project': project,
    'stack': stack,
    'prefix': resource_name_prefix
}

acr_name = resource_name_prefix.replace('-', '')

k8s_version = config.get('k8sVersion') or '1.19.11'

password = config.get('password') or RandomPassword('pw',
                                                    length=20, special=True)

generated_key_pair = PrivateKey('ssh-key',
                                algorithm='RSA', rsa_bits=4096)

admin_username = config.get('adminUserName') or 'testuser'

ssh_public_key = config.get('sshPublicKey') or \
                 generated_key_pair.public_key_openssh

node_count = config.get_int('nodeCount') or 1

node_size = config.get('nodeSize') or 'standard_D2as_v4'
