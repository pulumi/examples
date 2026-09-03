// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

import { S3Folder } from "./s3folder.js";

// Create an instance of the S3Folder component, serving the contents of ./www.
const folder = new S3Folder("pulumi-static-site", "./www");

// Export the component's outputs as stack outputs.
export const bucketName = folder.bucketName;
export const websiteUrl = folder.websiteUrl;
