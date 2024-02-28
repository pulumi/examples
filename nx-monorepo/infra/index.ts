import * as path from "path"
import * as s3folder from "s3folder"
import * as websiteDeploy from "website-deploy"

// Create the folder to hold our website files
const folder = new s3folder.S3Folder("my-folder", {})
export const websiteUrl = folder.websiteUrl

// Deploy the website to the folder
const generatedWebsite = path.join("..", "..", "generated-website")
const website = new websiteDeploy.WebsiteDeploy("my-website", folder.bucket, generatedWebsite, {})
