import { encode } from "utf8";
import { createHmac } from "crypto";

export function createSharedAccessToken(uri: string, saName: string, saKey: string): string {
    if (!uri || !saName || !saKey) {
        throw "Missing required parameter";
    }
    var encoded = encodeURIComponent(uri);
    var now = new Date();
    var week = 60 * 60 * 24 * 7;
    var ttl = Math.round(now.getTime() / 1000) + week;
    var signature = encoded + '\n' + ttl;
    var signatureUTF8 = encode(signature);
    var hash = createHmac('sha256', saKey).update(signatureUTF8).digest('base64');
    return 'SharedAccessSignature sr=' + encoded + '&sig=' + encodeURIComponent(hash) + '&se=' + ttl + '&skn=' + saName;
}
