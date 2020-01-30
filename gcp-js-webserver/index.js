const pulumi = require("@pulumi/pulumi");
const gcp = require("@pulumi/gcp");

const config = new pulumi.Config("gcp");

const computeNetwork = new gcp.compute.Network("webserver", {
    autoCreateSubnetworks: false,
});

const subnetwork = new gcp.compute.Subnetwork("webserver", {
    network: computeNetwork.selfLink,
    ipCidrRange: "10.2.0.0/16",
    region: config.require("region"),
    secondaryIpRanges: [{
        rangeName: "secondary-range",
        ipCidrRange: "192.168.10.0/24",
    }],
});

const computeFirewall = new gcp.compute.Firewall("webserver", {
    network: computeNetwork.selfLink,
    allows: [{
        protocol: "tcp",
        ports: [ "22", "80" ],
    }],
});

// (optional) create a simple web server using the startup script for the instance
const startupScript = `#!/bin/bash
echo "Hello, World!" > index.html
nohup python -m SimpleHTTPServer 80 &`;

const computeInstance = new gcp.compute.Instance("webserver", {
    machineType: "f1-micro",
    metadataStartupScript: startupScript,
    bootDisk: {
        initializeParams: {
            image: "debian-cloud/debian-9-stretch-v20181210",
        },
    },
    networkInterfaces: [{
        network: computeNetwork.id,
        subnetwork: subnetwork.id,
        accessConfigs: [{}], // must be empty to request an ephemeral IP
    }],
    serviceAccount: {
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    },
}, { dependsOn: [computeFirewall] });

exports.instanceName = computeInstance.name;
exports.instanceIP = computeInstance.networkInterfaces[0].accessConfigs[0].natIp;
