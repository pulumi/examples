// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as equinix from "@pulumi/equinix";
import * as random from "@pulumi/random";

const randomHostName = new random.RandomPet("hostname");

const project = equinix.getProject({name: "ci-project"});

const vm = new equinix.Device("vm", {
    metro: "da",
    billingCycle: equinix.BillingCycle.Hourly,
    hostname: randomHostName.id,
    operatingSystem: equinix.OperatingSystem.Ubuntu2004,
    plan: equinix.Plan.C3SmallX86,
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
