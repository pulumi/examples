import os
import pulumi

from dummy import Dummy

resource_count = int(os.environ.get('RESOURCE_COUNT', 64))
resource_payload_bytes = int(os.environ.get('RESOURCE_PAYLOAD_BYTES', 1024))

for i in range(0, resource_count):
    deadweight = '{:08}'.format(i) * int(resource_payload_bytes / 8)
    dummy = Dummy(f'dummy-{i}', deadweight=deadweight)
    if i == 0:
        pulumi.export('ResourcePayloadBytes', dummy.deadweight.apply(lambda s: len(s)))

pulumi.export('ResourceCount', resource_count)
