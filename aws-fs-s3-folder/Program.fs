module Program

open System.IO
open Pulumi
open Pulumi.FSharp
open Pulumi.Aws.S3.Inputs
open Pulumi.Aws.S3
open MimeTypes

let infra () =
    // Create an AWS resource (S3 Bucket)
    let bucket = Bucket("my-bucket", BucketArgs (Website = input (BucketWebsiteArgs (IndexDocument = "index.html"))))
    // For each file in wwwroot, create a bucket object
    let bucketObjects = ResizeArray()
    let files = Directory.GetFiles "wwwroot"
    for file in files do
        let fileName = Path.GetFileName file
        let extension = Path.GetExtension file
        let contentType = MimeTypeMap.GetMimeType extension

        let bucketArgs = BucketObjectArgs()
        bucketArgs.Acl <- "public-read"
        bucketArgs.Bucket <- bucket.BucketName
        bucketArgs.ContentType <- contentType
        bucketArgs.Source <- input (FileAsset file :> AssetOrArchive)

        let resourceOptions = CustomResourceOptions (Parent = bucket)
        // create a bucket object
        let bucketObject = BucketObject(fileName, bucketArgs, resourceOptions)
        bucketObjects.Add bucketObject

    // Export the name of the bucket
    let endpoint = bucket.WebsiteEndpoint.Apply (sprintf "http://%s")

    dict [ ("endpoint", endpoint :> obj) ]

[<EntryPoint>]
let main (args: string[]) = Deployment.run infra