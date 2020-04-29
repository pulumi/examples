import pulumi

import infra

pulumi.export('group', infra.group)
pulumi.export('server', infra.server)
pulumi.export('publicIp', infra.server.public_ip)
pulumi.export('publicHostName', infra.server.public_dns)
