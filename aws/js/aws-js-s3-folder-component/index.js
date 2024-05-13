const s3folder = require("./s3folder.js");

// Create an instance of the S3Folder component
let folder = new s3folder.S3Folder("pulumi-static-site", "./www");

// Export `folder` output properties as stack outputs
exports.bucketName = folder.bucketName;
exports.websiteUrl = folder.websiteUrl;
