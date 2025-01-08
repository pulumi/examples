module Program

open System.IO
open Pulumi
open Pulumi.FSharp
open Pulumi.Aws.S3.Inputs
open Pulumi.Aws.S3

let infra () =

    // Create an AWS resource (S3 Bucket)
    let bucket = BucketV2("my-bucket", BucketV2Args())

    let website =
        BucketWebsiteConfigurationV2("website",
                                     BucketWebsiteConfigurationV2Args
                                         (Bucket = bucket.Bucket,
                                          IndexDocument = new BucketWebsiteConfigurationV2IndexDocumentArgs(Suffix = "index.html")),
                                     CustomResourceOptions (Parent = bucket))

    let ownershipControls =
        BucketOwnershipControls("ownership-controls",
                                BucketOwnershipControlsArgs
                                    (Bucket = io bucket.Id,
                                     Rule = input (BucketOwnershipControlsRuleArgs(ObjectOwnership = input "ObjectWriter"))),
                                CustomResourceOptions (Parent = bucket))

    let publicAccessBlock =
        BucketPublicAccessBlock("public-access-block",
                                BucketPublicAccessBlockArgs
                                    (Bucket = io bucket.Id,
                                     BlockPublicAcls = input false),
                                CustomResourceOptions (Parent = bucket))

    // For each file in wwwroot ...
    let files = Directory.GetFiles "wwwroot"
    let bucketObjects =
        files
        |> Array.map(fun file ->
            let name = file.Substring 8
            let contentType = if name.EndsWith ".png" then "image/png" else "text/html"

            // ... create a bucket object
            BucketObject(name,
                         BucketObjectArgs
                            (Acl = input "public-read",
                             Bucket = io bucket.Bucket,
                             ContentType = input contentType,
                             Source = input (FileAsset file :> AssetOrArchive)),
                         CustomResourceOptions (Parent = bucket, DependsOn = inputList [input ownershipControls; input publicAccessBlock])))

    // Export the name of the bucket
    let endpoint = website.WebsiteEndpoint.Apply (sprintf "http://%s")
    dict [("endpoint", endpoint :> obj)]

[<EntryPoint>]
let main _ =
  Deployment.run infra
