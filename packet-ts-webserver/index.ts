// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as packet from "@pulumi/packet";
import * as random from "@pulumi/random";

const randomHostName = new random.RandomPet("hostname");

const project = packet.getProject({name: "ci-project"});

const vm = new packet.Device("vm", {
    facilities: [packet.Facilities.EWR1],
    billingCycle: packet.BillingCycles.Hourly,
    hostname: randomHostName.id,
    operatingSystem: packet.OperatingSystems.CoreOSStable,
    plan: packet.Plans.T1SmallX86,
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
