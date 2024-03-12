import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as fs from "fs";
import * as mime from "mime";
import * as path from "path";

export class WebsiteDeploy extends pulumi.ComponentResource {
  constructor(name: string, bucket: pulumi.Input<aws.s3.Bucket>, directory: string, opts: pulumi.ComponentResourceOptions) {
    super("pulumi:examples:WebsiteDeploy", name, {}, opts);

    // For each file in the directory, create an S3 object stored in `bucket`
    walk(directory, (filePath: string) => {
      const name = path.relative(directory, filePath);
      let object = new aws.s3.BucketObject(name, {
        bucket: bucket,
        source: new pulumi.asset.FileAsset(filePath),     // use FileAsset to point to a file
        contentType: mime.getType(filePath) || undefined, // set the MIME type of the file
      }, { parent: this });                               // specify resource parent
    })
  }
}

function walk(dir: string, callback: (path: string) => void) {
  for (let f of fs.readdirSync(dir)) {
    let filePath = path.join(dir, f);
    let isDirectory = fs.statSync(filePath).isDirectory();
    isDirectory ? walk(filePath, callback) : callback(filePath);
  }
}
