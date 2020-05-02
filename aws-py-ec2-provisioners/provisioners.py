# Copyright 2020, Pulumi Corporation.  All rights reserved.

import abc
import json
import io
import paramiko
import pulumi
from pulumi import dynamic
import sys
import time
from typing import Any, Optional
from typing_extensions import TypedDict
from uuid import uuid4

# ConnectionArgs tells a provisioner how to access a remote resource. It includes the hostname
# and optional port (default is 22), username, password, and private key information.
class ConnectionArgs(TypedDict):
    host: pulumi.Input[str]
    """The host to SSH into."""
    port: Optional[pulumi.Input[int]] = None
    """The port to SSH into (default 22)."""
    username: Optional[pulumi.Input[str]] = None
    """The username for the SSH login."""
    password: Optional[pulumi.Input[str]] = None
    """The optional password for the SSH login (private key is recommended instead)."""
    private_key: Optional[pulumi.Input[str]] = None
    """The private key, as an ASCII string, to use for the SSH connection."""
    private_key_passphrase: Optional[pulumi.Input[str]] = None
    """The private key passphrase, if any, to use for the SSH private key."""

def connect(conn: ConnectionArgs) -> paramiko.SSHClient:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    skey = io.StringIO(conn['private_key'])
    pkey = paramiko.RSAKey.from_private_key(skey, password=conn.get('private_key_passphrase'))

    # Retry the connection until the endpoint is available (up to 2 minutes).
    retries = 0
    while True:
        try:
            ssh.connect(
                hostname=conn['host'],
                port=conn.get('port') or 22,
                username=conn.get('username'),
                password=conn.get('password'),
                pkey=pkey,
            )
            return ssh
        except paramiko.ssh_exception.NoValidConnectionsError:
            if retries == 24:
                raise
            time.sleep(5)
            retries = retries + 1
            pass

class ProvisionerProvider(dynamic.ResourceProvider):
    __metaclass__ = abc.ABCMeta

    @abc.abstractmethod
    def on_create(self, inputs: Any) -> Any:
        return

    def create(self, inputs):
        outputs = self.on_create(inputs)
        return dynamic.CreateResult(id_=uuid4().hex, outs=outputs)

    def diff(self, _id, olds, news):
        # If anything changed in the inputs, replace the resource.
        diffs = []
        for key in olds:
            if key not in news:
                diffs.append(key)
            else:
                olds_value = json.dumps(olds[key], sort_keys=True, indent=2)
                news_value = json.dumps(news[key], sort_keys=True, indent=2)
                if olds_value != news_value:
                    diffs.append(key)
        for key in news:
            if key not in olds:
                diffs.append(key)

        return dynamic.DiffResult(changes=len(diffs) > 0, replaces=diffs, delete_before_replace=True)

# CopyFileProvider implements the resource lifecycle for the CopyFile resource type below.
class CopyFileProvider(ProvisionerProvider):
    def on_create(self, inputs: Any) -> Any:
        ssh = connect(inputs['conn'])
        scp = ssh.open_sftp()
        try:
            scp.put(inputs['src'], inputs['dest'])
        finally:
            scp.close()
            ssh.close()
        return inputs

# CopyFile is a provisioner step that can copy a file over an SSH connection.
class CopyFile(dynamic.Resource):
    def __init__(self, name: str, conn: pulumi.Input[ConnectionArgs],
                 src: str, dest: str, opts: Optional[pulumi.ResourceOptions] = None):
        self.conn = conn
        """conn contains information on how to connect to the destination, in addition to dependency information."""
        self.src = src
        """
        src is the source of the file or directory to copy. It can be specified as relative to the current
        working directory or as an absolute path. This cannot be specified if content is set.
        """
        self.dest = dest
        """dest is required and specifies the absolute path on the target where the file will be copied to."""

        super().__init__(
            CopyFileProvider(),
            name,
            {
                'dep': conn,
                'conn': conn,
                'src': src,
                'dest': dest,
            },
            opts,
        )

# RunCommandResult is the result of running a command.
class RunCommandResult(TypedDict):
    stdout: str
    """The stdout of the command that was executed."""
    stderr: str
    """The stderr of the command that was executed."""

# RemoteExecProvider implements the resource lifecycle for the RemoteExec resource type below.
class RemoteExecProvider(ProvisionerProvider):
    def on_create(self, inputs: Any) -> Any:
        ssh = connect(inputs['conn'])
        try:
            results = []
            for command in inputs['commands']:
                stdin, stdout, stderr = ssh.exec_command(command)
                results.append({
                    'stdout': ''.join(stdout.readlines()),
                    'stderr': ''.join(stderr.readlines()),
                })
            inputs['results'] = results
            print(f'results: {results}')
        finally:
            ssh.close()
        return inputs

# RemoteExec runs remote one or more commands over an SSH connection. It returns the resulting
# stdout and stderr from the commands in the results property.
class RemoteExec(dynamic.Resource):
    results: pulumi.Output[list]

    def __init__(self, name: str, conn: ConnectionArgs, commands: list, opts: Optional[pulumi.ResourceOptions] = None):
        self.conn = conn
        """conn contains information on how to connect to the destination, in addition to dependency information."""
        self.commands = commands
        """The commands to execute. Exactly one of 'command' and 'commands' is required."""
        self.results = []
        """The resulting command outputs."""

        super().__init__(
            RemoteExecProvider(),
            name,
            {
                'conn': conn,
                'commands': commands,
                'results': None,
            },
            opts,
        )
