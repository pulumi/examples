import * as aws from "@pulumi/aws";

export let size: aws.ec2.InstanceType = "t2.micro"; // the type InstanceType contains friendly names for AWS instance sizes

// create a new security group for port 80
let group = new aws.ec2.SecurityGroup("web-secgrp", { 
    description: "Enable HTTP access",
    ingress: [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    ],
});

// a function to find the Amazon Linux AMI for the current region
async function getLinuxAmi() {
    let result = await aws.getAmi({
        owners: ["amazon"],
        filter: [{ name: "name", values: ["amzn-ami-2017.03.g-amazon-ecs-optimized"] }]
    });
    return result.imageId;
}

let userData = 
    `#!/bin/bash
    echo "Hello, World!\nInstance metadata:" > index.html
    curl http://169.254.169.254/latest/meta-data/placement/availability-zone >> index.html
    nohup python -m SimpleHTTPServer 80 &`;

export function createInstance(name: string, size: aws.ec2.InstanceType, zone: string): aws.ec2.Instance {
    let result = new aws.ec2.Instance(name, {
        availabilityZone: zone,
        instanceType: size,                 // use function argument for size
        securityGroups: [ group.name ],     // reference the group object above
        ami: getLinuxAmi(),                 // call custom function
        tags: { "Name": name },
        userData: userData                  // set up a simple web server    
    });

    result.publicDns.then(url => console.log(`Server URL: http://${url}`));

    return result;
}