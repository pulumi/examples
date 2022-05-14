"""A minimal Python Pulumi program utilizing Stack Readmes"""

import pulumi


pulumi.export('strVar', 'foo')
pulumi.export('arrVar', ['fizz', 'buzz'])

# open template readme and read contents into stack output
with open('./Pulumi.README.md') as f:
    pulumi.export('readme', f.read())
