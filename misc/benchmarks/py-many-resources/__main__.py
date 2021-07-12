import os
import pulumi

from dummy import Dummy

config = pulumi.Config();

resource_count = config.require_int('resource_count')
resource_payload_bytes = config.require_int('resource_payload_bytes')

for i in range(0, resource_count):
    deadweight = '{:08}'.format(i) * int(resource_payload_bytes / 8)
    dummy = Dummy(f'dummy-{i}', deadweight=deadweight)
    if i == 0:
        pulumi.export('ResourcePayloadBytes', dummy.deadweight.apply(lambda s: len(s)))

pulumi.export('ResourceCount', resource_count)
