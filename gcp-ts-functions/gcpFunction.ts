import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as express from "express";

// Note: The `HttpFunction` helper defined here will in the future be made available via a `@pulumi/gcp-serverless`
// package, and extended to support additional configuration options similar to that available in
// `@pulumi/aws-serverless`.

// The callback type of a handler for a Google Cloud Functions HTTP Function.  
// See https://cloud.google.com/functions/docs/writing/http.
export type HttpHandler = (req: express.Request, resp: express.Response) => void;

// HttpFunction creates a Google Cloud Function HTTP Function from the provided JavaScript callback.
export class HttpFunction extends pulumi.ComponentResource {
    public bucket: gcp.storage.Bucket;
    public bucketObject: gcp.storage.BucketObject;
    public function: gcp.cloudfunctions.Function;

    public httpsTriggerUrl: pulumi.Output<string>;

    constructor(name: string, handler: HttpHandler, options?: pulumi.ResourceOptions) {
        super("gcp:serverless:HttpFunction", name, {}, options);

        // Serialize JavaScript callback to text
        const serializedFunction = pulumi.runtime.serializeFunction(handler);
        const functionText = serializedFunction.then(x => x.text);
        const functionEntryPoint = serializedFunction.then(x => x.exportName);

        // Create a bucket and object to store the function ZIP file
        this.bucket = new gcp.storage.Bucket(`${name}-bucket`, {}, { parent: this });
        this.bucketObject = new gcp.storage.BucketObject(`${name}-object`, {
            bucket: this.bucket.name,
            source: new pulumi.asset.AssetArchive({
                "index.js": new pulumi.asset.StringAsset(functionText),
            }),
        }, { parent: this });

        // Create the Function resource
        this.function = new gcp.cloudfunctions.Function(`${name}-function`, {
            sourceArchiveBucket: this.bucket.name,
            sourceArchiveObject: this.bucketObject.name,
            entryPoint: functionEntryPoint,
            triggerHttp: true,
        }, { parent: this });

        // Make the trigger URL easily accessible
        this.httpsTriggerUrl = this.function.httpsTriggerUrl;
    }
}