// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

import { MultiNicVm } from "./components/multiNicVm.js";
import { VpcNetwork } from "./components/vpcNetwork.js";

const config = new pulumi.Config();
const nicCount = config.getNumber("nicCount") ?? 3;
const machineType = config.get("machineType") ?? "n2-standard-4";

const region = gcp.config.region ?? "us-central1";
const zone = gcp.config.zone ?? `${region}-a`;

if (nicCount < 1 || nicCount > 8) {
    throw new Error(`nicCount must be between 1 and 8 (GCE limit); got ${nicCount}`);
}

// One VPC per NIC — GCE requires each NIC on an instance live in a distinct VPC.
const vpcs = Array.from(
    { length: nicCount },
    (_, i) =>
        new VpcNetwork(`vpc-${i}`, {
            region,
            cidr: `10.${10 + i}.0.0/24`,
            description: `VPC #${i} for multi-NIC VM`,
            allowIapSsh: i === 0,
        }),
);

const vm = new MultiNicVm("multi-nic-vm", {
    zone,
    machineType,
    subnets: vpcs.map((v) => v.subnet.id),
    publicNicIndices: [0],
    tags: ["multi-nic-demo"],
});

export const vmName = vm.instance.name;
export const vmZone = vm.instance.zone;
export const nicSummary = vm.nicSummary();
