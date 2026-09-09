import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";

// Import the program's configuration settings.
const config = new pulumi.Config();
const zoneId = config.require("zoneId");

// An A record pointing "www" at an origin server.
const www = new cloudflare.DnsRecord("www", {
    zoneId: zoneId,
    name: "www",
    type: "A",
    content: "192.0.2.1",
    ttl: 3600,
    proxied: false,
});

// A CNAME aliasing "docs" to an externally hosted site.
const docs = new cloudflare.DnsRecord("docs", {
    zoneId: zoneId,
    name: "docs",
    type: "CNAME",
    content: "hosting.example.com",
    ttl: 3600,
    proxied: false,
});

// A TXT record, e.g. for domain verification or SPF.
const txt = new cloudflare.DnsRecord("txt", {
    zoneId: zoneId,
    name: "mail",
    type: "TXT",
    content: "v=spf1 include:_spf.example.com ~all",
    ttl: 3600,
});

// Export the fully-qualified names of the records.
export const records = [www.name, docs.name, txt.name];
