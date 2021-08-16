# Copyright 2020, Pulumi Corporation.  All rights reserved.

import pulumi
import pulumi_aws as aws
import provisioners
import base64

# Get the config ready to go.
config = pulumi.Config()

# If keyName is provided, an existing KeyPair is used, else if publicKey is provided a new KeyPair
# derived from the publicKey is created.
key_name = config.get('keyName')
public_key = config.get('publicKey')


# The privateKey associated with the selected key must be provided (either directly or base64 encoded),
# along with an optional passphrase if needed.
def decode_key(key):

    try:
        key = base64.b64decode(key.encode('ascii')).decode('ascii')
    except:
        pass

    if key.startswith('-----BEGIN RSA PRIVATE KEY-----'):
        return key

    return key.encode('ascii')


private_key = config.require_secret('privateKey').apply(decode_key)
private_key_passphrase = config.get_secret('privateKeyPassphrase')

# Create a new security group that permits SSH and web access.
secgrp = aws.ec2.SecurityGroup('secgrp',
    description='Foo',
    ingress=[
        aws.ec2.SecurityGroupIngressArgs(protocol='tcp', from_port=22, to_port=22, cidr_blocks=['0.0.0.0/0']),
        aws.ec2.SecurityGroupIngressArgs(protocol='tcp', from_port=80, to_port=80, cidr_blocks=['0.0.0.0/0']),
    ],
)

# Get the AMI
ami = aws.ec2.get_ami(
    owners=['amazon'],
    most_recent=True,
    filters=[aws.ec2.GetAmiFilterArgs(
        name='name',
        values=['amzn2-ami-hvm-2.0.????????-x86_64-gp2'],
    )],
)

# Create an EC2 server that we'll then provision stuff onto.
size = 't2.micro'
if key_name is None:
    key = aws.ec2.KeyPair('key', public_key=public_key)
    key_name = key.key_name
server = aws.ec2.Instance('server',
    instance_type=size,
    ami=ami.id,
    key_name=key_name,
    vpc_security_group_ids=[ secgrp.id ],
)
conn = provisioners.ConnectionArgs(
    host=server.public_ip,
    username='ec2-user',
    private_key=private_key,
    private_key_passphrase=private_key_passphrase,
)

# Copy a config file to our server.
cp_config = provisioners.CopyFile('config',
    conn=conn,
    src='myapp.conf',
    dest='myapp.conf',
    opts=pulumi.ResourceOptions(depends_on=[server]),
)

# Execute a basic command on our server.
cat_config = provisioners.RemoteExec('cat-config',
    conn=conn,
    commands=['cat myapp.conf'],
    opts=pulumi.ResourceOptions(depends_on=[cp_config]),
)

# Export the server's IP/host and stdout from the command.
pulumi.export('publicIp', server.public_ip)
pulumi.export('publicHostName', server.public_dns)
pulumi.export('catConfigStdout', cat_config.results[0]['stdout'])
