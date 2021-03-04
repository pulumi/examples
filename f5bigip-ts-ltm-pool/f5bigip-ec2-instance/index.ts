// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import * as fs from "fs";

const config = new pulumi.Config();
const bigIpAdminPassword = config.require("f5BigIpAdminPassword");

const baseTags = {
    project: `${pulumi.getProject()}-${pulumi.getStack()}`,
};

const firewall = new aws.ec2.SecurityGroup("bigIp", {
    description: "admin access",
    ingress: [
        // Admin access
        { protocol: "tcp", fromPort: 8443, toPort: 8443, cidrBlocks: ["0.0.0.0/0"] },
        // Client access
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    ],
    egress: [
        { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
    ],
    tags: baseTags,
});

/*
    NOTE: We pin to a specific AMI Name because later versions seem to never complete startup - even without our userdata script.
    https://aws.amazon.com/marketplace/pp/B079C44MFH?qid=1546534998240&sr=0-13
    aws ec2 describe-images \
        --filters "Name=product-code,Values=8esk90vx7v713sa0muq2skw3j" \
        --filters "Name=name,Values='F5 Networks BIGIP-14.0.0.1-0.0.2 PAYG - Good 25Mbps *'"
*/
const bigIpAmiId = aws.ec2.getAmi({
    mostRecent: true,
    owners: ["679593333241"],
    filters: [
        { name: "product-code", values: ["8esk90vx7v713sa0muq2skw3j"] },
        { name: "name", values: ["F5 Networks BIGIP-14.0.0.1-0.0.2 PAYG - Good 25Mbps *"] },
    ],
}).then(ami => ami.id);

const bigIpUserData =
    `#!/bin/bash

# Adapted from https://github.com/f5devcentral/f5-terraform/blob/master/modules/providers/aws/infrastructure/proxy/standalone/1nic/byol/user_data.tpl.
# Script must be non-blocking or run in the background.

cat << 'EOF' > /tmp/pulumi-startup-script.sh

#!/bin/bash

set -e

echo "** Downloading BigIP util script ..."
curl -# -o /tmp/util.sh https://raw.githubusercontent.com/F5Networks/f5-cloud-libs/master/scripts/util.sh
echo "** Download complete."

. /tmp/util.sh
wait_for_bigip

tmsh modify auth user admin password ${bigIpAdminPassword}

EOF

echo '** BigIP Userdata script output will be written to /tmp/pulumi-startup-script.out.'
echo '** BigIP Userdata script will background itself... now.'

# Now run in the background to not block BigIP startup
chmod 755 /tmp/pulumi-startup-script.sh
nohup /tmp/pulumi-startup-script.sh &> /tmp/pulumi-startup-script.out &

`;

const f5BigIpInstance = new aws.ec2.Instance("bigIp", {
    ami: bigIpAmiId,
    instanceType: "t2.medium",
    tags: Object.assign({ Name: "bigIp" }, baseTags),
    userData: bigIpUserData,

    vpcSecurityGroupIds: [firewall.id],
});

export const f5Address = pulumi.interpolate `https://${f5BigIpInstance.publicIp}:8443`;
export const f5PrivateIp = f5BigIpInstance.privateIp;
