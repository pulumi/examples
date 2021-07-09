import * as pulumi from "@pulumi/pulumi";

import { Dummy } from "./dummy";

const resourceCount: number = Number(process.env.RESOURCE_COUNT || 64);
const resourcePayloadBytes: number = Number(process.env.RESOURCE_PAYLOAD_BYTES || 1024);

function pad8(num: number): string {
    return ('00000000' + num).slice(-8);
}

export = async () => {
    const out: { [name: string]: pulumi.Output<string> } = {};

    for (var i = 0;  i < resourceCount; i++) {
        const deadweight = pad8(i).repeat(resourcePayloadBytes/8);
        const dummy = new Dummy(`dummy-${i}`, deadweight);
        out[`output-${i}`] = dummy.deadweight;
    }

    return out;
}
