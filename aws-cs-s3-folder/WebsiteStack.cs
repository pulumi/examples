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
        var bucket = new Bucket("my-bucket", new BucketArgs
        {
            Website = new BucketWebsiteArgs
            {
                IndexDocument = "index.html"
            }
        });

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
                Bucket = bucket.BucketName,
                ContentType = contentType,
                Source = new FileAsset(file)
            }, new CustomResourceOptions {Parent = bucket});
        }

        this.Endpoint = Output.Format($"http://{bucket.WebsiteEndpoint}");
    }

    [Output] public Output<string> Endpoint { get; set; }
}
