// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

export interface MultiNicVmArgs {
    zone: pulumi.Input<string>;
    machineType: pulumi.Input<string>;
    /** Subnets to attach, in order. NIC count == subnets.length. */
    subnets: pulumi.Input<string>[];
    /** Indices of NICs that should receive a public IP. Defaults to [0]. */
    publicNicIndices?: number[];
    image?: pulumi.Input<string>;
    bootDiskSizeGb?: pulumi.Input<number>;
    serviceAccountId?: pulumi.Input<string>;
    tags?: pulumi.Input<string>[];
}

/**
 * A GCE VM with one network interface per provided subnet. Each NIC must
 * live in a distinct VPC (GCE requirement). Always sets `canIpForward` and
 * `nicType: GVNIC`, attaches a dedicated service account, and installs a
 * startup script that prints the live NIC topology to the serial console.
 */
export class MultiNicVm extends pulumi.ComponentResource {
    public readonly serviceAccount: gcp.serviceaccount.Account;
    public readonly instance: gcp.compute.Instance;

    constructor(name: string, args: MultiNicVmArgs, opts?: pulumi.ComponentResourceOptions) {
        super("pkg:gcp:MultiNicVm", name, {}, opts);

        const publicNics = new Set(args.publicNicIndices ?? [0]);

        this.serviceAccount = new gcp.serviceaccount.Account(
            `${name}-sa`,
            {
                accountId: args.serviceAccountId ?? name,
                displayName: `Service account for ${name}`,
            },
            { parent: this },
        );

        const networkInterfaces: pulumi.Input<gcp.types.input.compute.InstanceNetworkInterface>[] = args.subnets.map(
            (subnet, i) => ({
                subnetwork: subnet,
                nicType: "GVNIC",
                accessConfigs: publicNics.has(i) ? [{}] : [],
            }),
        );

        this.instance = new gcp.compute.Instance(
            name,
            {
                zone: args.zone,
                machineType: args.machineType,
                canIpForward: true,
                bootDisk: {
                    initializeParams: {
                        image: args.image ?? "debian-cloud/debian-12",
                        size: args.bootDiskSizeGb ?? 20,
                    },
                },
                networkInterfaces,
                serviceAccount: {
                    email: this.serviceAccount.email,
                    scopes: ["cloud-platform"],
                },
                metadata: {
                    "enable-oslogin": "TRUE",
                },
                metadataStartupScript: startupScript(name),
                tags: args.tags,
            },
            { parent: this, dependsOn: [this.serviceAccount] },
        );

        this.registerOutputs({
            instanceName: this.instance.name,
            instanceZone: this.instance.zone,
        });
    }

    /** Per-NIC summary: index, network, subnet, internal IP, external IP. */
    public nicSummary(): pulumi.Output<
        Array<{
            index: number;
            network: string;
            subnetwork: string;
            internalIp: string;
            externalIp: string | null;
            nicType: string | undefined;
        }>
    > {
        return this.instance.networkInterfaces.apply((nics) =>
            nics.map((nic, i) => ({
                index: i,
                network: nic.network,
                subnetwork: nic.subnetwork,
                internalIp: nic.networkIp,
                externalIp: nic.accessConfigs?.[0]?.natIp ?? null,
                nicType: nic.nicType,
            })),
        );
    }
}

function startupScript(name: string): string {
    return `#!/bin/bash
set -eux
{
  echo "===== ${name}: NIC topology ====="
  date -Is
  echo "----- ip -br addr -----"
  ip -br addr
  echo "----- ip route -----"
  ip route
  echo "----- GCE metadata: interfaces -----"
  curl -fsS -H 'Metadata-Flavor: Google' \\
    'http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/?recursive=true&alt=text' || true
  echo "===== END ====="
} | tee /var/log/multi-nic-report.log > /dev/kmsg
`;
}
