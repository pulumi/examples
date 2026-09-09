import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";

// Import the program's configuration settings.
const config = new pulumi.Config();
const zoneId = config.require("zoneId");
const origin = config.require("origin");
const hostname = config.get("hostname") || "www";

// A proxied DNS record, so traffic flows through Cloudflare's CDN and WAF.
const record = new cloudflare.DnsRecord("record", {
    zoneId: zoneId,
    name: hostname,
    type: "CNAME",
    content: origin,
    ttl: 1,
    proxied: true,
});

// Cache responses at the edge, overriding the origin's cache headers.
const cache = new cloudflare.Ruleset("cache", {
    zoneId: zoneId,
    name: "cache-everything",
    kind: "zone",
    phase: "http_request_cache_settings",
    rules: [{
        action: "set_cache_settings",
        expression: "true",
        enabled: true,
        actionParameters: {
            cache: true,
            edgeTtl: {
                mode: "override_origin",
                default: 3600,
            },
        },
    }],
});

// Rate-limit requests per IP to protect the origin from abuse.
const rateLimit = new cloudflare.Ruleset("rate-limit", {
    zoneId: zoneId,
    name: "rate-limit",
    kind: "zone",
    phase: "http_ratelimit",
    rules: [{
        action: "block",
        expression: "true",
        enabled: true,
        ratelimit: {
            characteristics: ["ip.src", "cf.colo.id"],
            period: 60,
            requestsPerPeriod: 100,
            mitigationTimeout: 60,
        },
    }],
});

// Export the URL served through Cloudflare.
export const url = pulumi.interpolate`https://${record.name}`;
