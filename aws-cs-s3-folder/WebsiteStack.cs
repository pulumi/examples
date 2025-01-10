using System.IO;
using Examples;
using Pulumi;
using Pulumi.Aws.S3;
using Pulumi.Aws.S3.Inputs;

class WebsiteStack : Stack
{
    public WebsiteStack()
    {
        // Create an AWS resource (S3 Bucket)
        var bucket = new BucketV2("my-bucket", new BucketV2Args {});

        var bucketWebsite = new BucketWebsiteConfigurationV2("website-config", new()
        {
            Bucket = bucket.Id,
            IndexDocument = new BucketWebsiteConfigurationV2IndexDocumentArgs
            {
                Suffix = "index.html",
            },
        }, new CustomResourceOptions {Parent = bucket});

        var ownershipControls = new BucketOwnershipControls("ownership-controls", new()
        {
            Bucket = bucket.Id,
            Rule = new BucketOwnershipControlsRuleArgs
            {
                ObjectOwnership = "ObjectWriter",
            },
        }, new CustomResourceOptions {Parent = bucket});

        var publicAccessBlock = new BucketPublicAccessBlock("public-access-block", new()
        {
            Bucket = bucket.Id,
            BlockPublicAcls = false,
        }, new CustomResourceOptions {Parent = bucket});

        // For each file in wwwroot ...
        var files = Directory.GetFiles("wwwroot");
        foreach (var file in files)
        {
            var name = file.Substring(8);
            var contentType = MimeTypes.GetMimeType(file);

            // ... create a bucket object
            var bucketObject = new BucketObject(name, new BucketObjectArgs
            {
                Acl = "public-read",
                Bucket = bucket.Bucket,
                ContentType = contentType,
                Source = new FileAsset(file)
            }, new CustomResourceOptions {Parent = bucket, DependsOn = new Pulumi.Resource[]{ publicAccessBlock, ownershipControls }});
        }

        this.Endpoint = Output.Format($"http://{bucketWebsite.WebsiteEndpoint}");
    }

    [Output] public Output<string> Endpoint { get; set; }
}
