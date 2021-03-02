// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import { createHmac } from "crypto";
import { encode } from "utf8";

export function createSharedAccessToken(uri: string, saName: string, saKey: string): string {
    if (!uri || !saName || !saKey) {
        throw "Missing required parameter";
    }
    const encoded = encodeURIComponent(uri);
    const now = new Date();
    const week = 60 * 60 * 24 * 7;
    const ttl = Math.round(now.getTime() / 1000) + week;
    const signature = encoded + "\n" + ttl;
    const signatureUTF8 = encode(signature);
    const hash = createHmac("sha256", saKey).update(signatureUTF8).digest("base64");
    return "SharedAccessSignature sr=" + encoded + "&sig=" + encodeURIComponent(hash) + "&se=" + ttl + "&skn=" + saName;
}
