import * as path from "path"
import * as s3folder from "s3folder"
import * as websiteDeploy from "website-deploy"

// Create the folder to hold our website files
const folder = new s3folder.S3Folder("my-folder", {})

export const bucketId = folder.bucket.id;
export const websiteUrl = folder.websiteUrl.apply(url => `http://${url}`)

// Deploy the website to the folder
const websiteFiles = path.join("..", "..", "website", "dist")
const website = new websiteDeploy.WebsiteDeploy("my-website", bucketId, websiteFiles, {})

