import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as mime from "mime";

export class WebsiteDeploy extends pulumi.ComponentResource {
  constructor(name: string, bucket: pulumi.Input<aws.s3.Bucket>, path: string, opts: pulumi.ComponentResourceOptions) {
    super("pulumi:examples:WebsiteDeploy", name, {}, opts);

    // For each file in the directory, create an S3 object stored in `bucket`
    for (let item of require("fs").readdirSync(path)) {
      let filePath = require("path").join(path, item);
      let object = new aws.s3.BucketObject(item, {
        bucket: bucket,
        source: new pulumi.asset.FileAsset(filePath),     // use FileAsset to point to a file
        contentType: mime.getType(filePath) || undefined, // set the MIME type of the file
      }, { parent: this }); // specify resource parent
    }
  }
}
