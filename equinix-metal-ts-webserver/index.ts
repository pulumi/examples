// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as metal from "@pulumi/equinix-metal";
import * as random from "@pulumi/random";

const randomHostName = new random.RandomPet("hostname");

const project = metal.getProject({name: "ci-project"});

const vm = new metal.Device("vm", {
    metro: "da",
    billingCycle: metal.BillingCycle.Hourly,
    hostname: randomHostName.id,
    operatingSystem: metal.OperatingSystem.Ubuntu2004,
    plan: metal.Plan.C3SmallX86,
    projectId:  project.then(p => p.id),
    ipAddresses: [{
        type: "public_ipv4",
    },
    {
        type: "private_ipv4",
    }],
});

export const ip = vm.accessPublicIpv4;
export const name = vm.hostname;
