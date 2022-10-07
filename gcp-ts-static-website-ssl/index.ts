import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as synced_folder from "@pulumi/synced-folder";



// Import the program's configuration settings.
const config = new pulumi.Config();
const domain = config.require("domain");
const path = config.get("path") || "./www";
const indexDocument = config.get("indexDocument") || "index.html";
const errorDocument = config.get("errorDocument") || "error.html";

// Enable the Compute Service API on GCP Project
const apiService = new gcp.projects.Service("project", {
    disableDependentServices: true,
    service: "compute.googleapis.com",
});

// Create a storage bucket and configure it as a website.
const bucket = new gcp.storage.Bucket("bucket", {
    location: "EU",
    website: {
        mainPageSuffix: indexDocument,
        notFoundPage: errorDocument,
    },
}, { dependsOn: [apiService] });

// Create an IAM binding to allow public read access to the bucket.
const bucketIamBinding = new gcp.storage.BucketIAMBinding("bucket-iam-binding", {
    bucket: bucket.name,
    role: "roles/storage.objectViewer",
    members: ["allUsers"],
});

// Use a synced folder to manage the files of the website.
const syncedFolder = new synced_folder.GoogleCloudFolder("synced-folder", {
    path: path,
    bucketName: bucket.name,
});

// Enable the storage bucket as a CDN.
const backendBucket = new gcp.compute.BackendBucket("backend-bucket", {
    bucketName: bucket.name,
    enableCdn: true,
}, { dependsOn: [apiService] });

// Provision a global IP address for the CDN.
const ip = new gcp.compute.GlobalAddress("ip", {}, { dependsOn: [apiService] });

// Create a URLMap to route requests to the storage bucket.
const urlMapHttp = new gcp.compute.URLMap("url-map-http", {
    defaultUrlRedirect: {
        stripQuery: false,
        httpsRedirect: true,
    },
}, { dependsOn: [apiService] });

// Create a URLMap to route requests to the storage bucket.
const urlMapHttps = new gcp.compute.URLMap("url-map-https", {
    defaultService: backendBucket.selfLink,
}, { dependsOn: [apiService] });

// Create Managed SSL Certificate
const managedSSLCert = new gcp.compute.ManagedSslCertificate("managed-ssl-cert", {
    name: "managed-ssl-cert",
    managed: {
        domains: [domain],
    },
    type: "MANAGED",
}, { dependsOn: [apiService] });

// Create an HTTPS proxy to route requests to the URLMap.
const httpsProxy = new gcp.compute.TargetHttpsProxy("https-proxy", {
    urlMap: urlMapHttps.selfLink,
    sslCertificates: [managedSSLCert.selfLink],
}, { dependsOn: [apiService] });

// Create an HTTP proxy to route requests to the URLMap.
const httpProxy = new gcp.compute.TargetHttpProxy("http-proxy", {
    urlMap: urlMapHttp.selfLink,
}, { dependsOn: [apiService] });


// Create a GlobalForwardingRule rule to route requests to the HTTP proxy.
const httpForwardingRule = new gcp.compute.GlobalForwardingRule("http-forwarding-rule", {
    ipAddress: ip.address,
    ipProtocol: "TCP",
    portRange: "80",
    target: httpProxy.selfLink,
}, { dependsOn: [apiService] });

// Create a GlobalForwardingRule rule to route requests to the HTTPS proxy.
const httpsForwardingRule = new gcp.compute.GlobalForwardingRule("https-forwarding-rule", {
    ipAddress: ip.address,
    ipProtocol: "TCP",
    portRange: "443",
    target: httpsProxy.selfLink,
}, { dependsOn: [apiService] });

// Export the URLs and hostnames of the bucket and CDN.
export const originURL = pulumi.interpolate`https://storage.googleapis.com/${bucket.name}/index.html`;
export const originHostname = pulumi.interpolate`storage.googleapis.com/${bucket.name}`;
export const cdnHttpURL = pulumi.interpolate`http://${domain}`;
export const cdnHttpsURL = pulumi.interpolate`https://${domain}`;
export const cdnHttpHostname = ip.address;

