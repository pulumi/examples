import pulumi

import resources

pulumi.export("outprop", resources.mycomponent.outprop)
pulumi.export("public_ip", resources.myinstance.public_ip)