const gcp = require("@pulumi/gcp");

const computeNetwork = new gcp.compute.Network("network", {
    autoCreateSubnetworks: true,
});

const computeFirewall = new gcp.compute.Firewall("firewall", {
    network: computeNetwork.selfLink,
    allows: [{
        protocol: "tcp",
        ports: [ "22", "80" ],
    }],
    sourceTags: ["web"],
});

// (optional) create a simple web server using the startup script for the instance
const startupScript = `#!/bin/bash
echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &`;

const computeInstance = new gcp.compute.Instance("instance", {
    machineType: "f1-micro",
    metadataStartupScript: startupScript,
    bootDisk: {
        initializeParams: {
            image: "debian-cloud/debian-9-stretch-v20181210",
        },
    },
    networkInterfaces: [{
        network: computeNetwork.id,
        accessConfigs: [{}], // must be empty to request an ephemeral IP
    }],
    serviceAccount: {
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    },
}, { dependsOn: [computeFirewall] });

exports.instanceName = computeInstance.name;
exports.instanceIP = computeInstance.networkInterfaces[0].accessConfigs[0].natIp;
