import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

const config = new pulumi.Config("gcp");

const providers = ["project1", "project2"].map(x => {
    return new gcp.Provider(x, {
        project: config.get(x),
    });
});

const networks = providers.map((provider, index) => {
    return new gcp.compute.Network(`network${index + 1}`, {
        autoCreateSubnetworks: false
    }, {provider: providers[index]});
});

const peering1to2 = new gcp.compute.NetworkPeering("peer1to2", {
    network: networks[0].id,
    peerNetwork: networks[1].id,
}, {provider: providers[0]});

const peering2to1 = new gcp.compute.NetworkPeering("peer2to1", {
    network: networks[1].id,
    peerNetwork: networks[0].id,
}, {provider: providers[1]});

export const networkIds = networks.map(x => x.id);
export const networkPeeringIds = [
    peering1to2.id,
    peering2to1.id
];
