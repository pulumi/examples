// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

export interface VpcNetworkArgs {
    region: pulumi.Input<string>;
    cidr: pulumi.Input<string>;
    description?: pulumi.Input<string>;
    allowIapSsh?: boolean;
}

/**
 * A self-contained VPC: one custom-mode network, one regional subnet, and
 * the firewall rules needed for intra-VPC chatter plus optional IAP SSH.
 */
export class VpcNetwork extends pulumi.ComponentResource {
    public readonly network: gcp.compute.Network;
    public readonly subnet: gcp.compute.Subnetwork;

    constructor(name: string, args: VpcNetworkArgs, opts?: pulumi.ComponentResourceOptions) {
        super("pkg:gcp:VpcNetwork", name, {}, opts);

        this.network = new gcp.compute.Network(
            `${name}-net`,
            {
                autoCreateSubnetworks: false,
                description: args.description,
            },
            { parent: this },
        );

        this.subnet = new gcp.compute.Subnetwork(
            `${name}-subnet`,
            {
                network: this.network.id,
                region: args.region,
                ipCidrRange: args.cidr,
                privateIpGoogleAccess: true,
            },
            { parent: this },
        );

        new gcp.compute.Firewall(
            `${name}-allow-internal`,
            {
                network: this.network.id,
                direction: "INGRESS",
                sourceRanges: [args.cidr],
                allows: [
                    { protocol: "icmp" },
                    { protocol: "tcp", ports: ["0-65535"] },
                    { protocol: "udp", ports: ["0-65535"] },
                ],
            },
            { parent: this },
        );

        if (args.allowIapSsh) {
            new gcp.compute.Firewall(
                `${name}-allow-ssh-iap`,
                {
                    network: this.network.id,
                    direction: "INGRESS",
                    // IAP TCP forwarding range — see
                    // https://cloud.google.com/iap/docs/using-tcp-forwarding
                    sourceRanges: ["35.235.240.0/20"],
                    allows: [{ protocol: "tcp", ports: ["22"] }],
                },
                { parent: this },
            );
        }

        this.registerOutputs({
            networkId: this.network.id,
            subnetId: this.subnet.id,
        });
    }
}
