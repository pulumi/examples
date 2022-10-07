[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-static-website-ssl/README.md)

# Static Website on GCP with Managed SSL Certificate

A simple static html website hosted within a [GCP Storage bucket](https://cloud.google.com/storage/docs/buckets). The storage bucket is attached to a [GCP External Global Load Balancer](https://cloud.google.com/load-balancing/docs/https) and assigned a [managed SSL certificate](https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs) to ensure https (secure ssl) connections to your static site. 

**Note:** This example requires a registered domain name for which you have access to modify the `DNS A` record to point to the GCP load balancer.

In this example we will do the following: 

1. Create a GCP Storage Bucket located within Europe.
2. Upload the content of our Static Website to the Storage Bucket.
3. Enable Google Cloud CDN on the storag bucket. 
4. Create a Global External Load Balancer.
5. Reserve a Global IP address and assign it to the load baalncer.
6. Create a managed SSL Certificate for our chosen Domain Name.
7. Configure URL Maps to route from our Public IP address, to our Static Storag Bucket.
8. View our new Static Website

## Deploying and running the Pulumi App

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1.  Create a new stack:

    ```bash
    $ pulumi stack init static-site
    ```
    
1.  Set the GCP region and project:

    ```
    $ pulumi config set gcp:region europe-west1
    $ pulumi config set gcp:project <your gcp project>
    $ pulumi config set gcp-ts-static-website-ssl:domain <your domain>
    ```

1.  Restore NPM modules via `npm install` or `yarn install`.

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing update (static-site):
    ...

    Do you want to perform this update? yes
    Updating (static-site):
        Type                                      Name                    Status      
    +   pulumi:pulumi:Stack                       gcp-ts-static-website-ssl-static-site  created     
    +   ├─ gcp:projects:Service                   project                 created     
    +   ├─ gcp:compute:GlobalAddress              ip                      created     
    +   ├─ gcp:compute:ManagedSslCertificate      managed-ssl-cert        created     
    +   ├─ gcp:storage:Bucket                     bucket                  created     
    +   ├─ gcp:storage:BucketIAMBinding           bucket-iam-binding      created     
    +   ├─ gcp:compute:BackendBucket              backend-bucket          created     
    +   ├─ synced-folder:index:GoogleCloudFolder  synced-folder           created     
    +   │  ├─ gcp:storage:BucketObject            index.html              created     
    +   │  └─ gcp:storage:BucketObject            error.html              created     
    +   ├─ gcp:compute:URLMap                     url-map-https           created     
    +   ├─ gcp:compute:TargetHttpsProxy           https-proxy             created     
    +   ├─ gcp:compute:TargetHttpProxy            http-proxy              created     
    +   ├─ gcp:compute:GlobalForwardingRule       http-forwarding-rule    created     
    +   └─ gcp:compute:GlobalForwardingRule       https-forwarding-rule   created     
    
    Outputs:
        cdnHttpHostname: "34.117.212.111"
        cdnHttpURL     : "http://***"
        cdnHttpsURL    : "https://***"
        originHostname : "storage.googleapis.com/bucket-***"
        originURL      : "https://storage.googleapis.com/bucket-***/index.html"

    Resources:
        + 15 created

    Duration: 2m11s
    
    ```

## Configuring your Domain DNS Settings

In order for the The Google-managed SSL certificate to be obtained from the Certificate Authority the IP address of your load balancer (displayed in the output as ```cdnHttpHostname```) of your ```pulumi up``` statement needs to be assigned to an `A Record` in your DNS management system. 

1. Go to your DNS provider for your domain name. 

2. Manage DNS entries. 

3. Create or modify your `A Record` and assign it to the IP address output as ```cdnHttpHostname```.

4. Wait (make a cup of coffee), certificate signing can take up to 30 minutes to complete as it requires DNS propagation. 

5. Test your static site by hitting the: ```cdnHttpsURL``` output url and see a SSL secure Static Website.


## Clean up

1.  Run `pulumi destroy` to tear down all resources.

2.  To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi Console.
