// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as equinix from "@equinix-labs/pulumi-equinix";
import * as random from "@pulumi/random";

const randomHostName = new random.RandomPet("hostname");

const project = equinix.metal.getProject({name: "ci-project"});

const vm = new equinix.metal.Device("vm", {
    metro: "da",
    billingCycle: equinix.metal.BillingCycle.Hourly,
    hostname: randomHostName.id,
    operatingSystem: equinix.metal.OperatingSystem.Ubuntu2204,
    plan: equinix.metal.Plan.C3SmallX86,
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
