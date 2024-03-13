import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as fs from "fs";
import * as mime from "mime";
import * as path from "path";

export class WebsiteDeploy extends pulumi.ComponentResource {

  /**
   * WebsiteDeploy uploads files from a directory to an S3 bucket.
   * @param name The name of the resource.
   * @param bucket The S3 bucket to upload files to.
   * @param directory The directory to upload files from.
   * @param opts 
   */
  constructor(name: string, bucketId: pulumi.Input<string>, directory: string, opts: pulumi.ComponentResourceOptions) {
    super("pulumi:examples:WebsiteDeploy", name, {}, opts);

    // For each file in the directory, create an S3 object stored in `bucket`
    walk(directory, (filePath: string) => {
      const name = path.relative(directory, filePath);
      const object = new aws.s3.BucketObject(name, {
        bucket: bucketId,
        source: new pulumi.asset.FileAsset(filePath),     // use FileAsset to point to a file
        contentType: mime.getType(filePath) || undefined, // set the MIME type of the file
      }, { parent: this });                               // specify resource parent
    })
  }
}

// Walk recursively walks the file tree at dir and calls callback for each file found.
function walk(dir: string, callback: (path: string) => void) {
  for (const f of fs.readdirSync(dir)) {
    const filePath = path.join(dir, f);
    const isDirectory = fs.statSync(filePath).isDirectory();
    isDirectory ? walk(filePath, callback) : callback(filePath);
  }
}
