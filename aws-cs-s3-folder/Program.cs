using System.IO;
using System.Collections.Generic;
using Pulumi;
using Pulumi.Aws.S3;
using Pulumi.Aws.S3.Inputs;
using MimeTypes;

await Deployment.RunAsync(() =>
{
    // create an AWS resource (S3 Bucket)
    var bucket = new Bucket("my-bucket", new BucketArgs
    {
        Website = new BucketWebsiteArgs
        {
            IndexDocument = "index.html"
        }
    });

    // for each file in wwwroot
    var files = Directory.GetFiles("wwwroot");
    foreach (var file in files)
    {
        var fileName = Path.GetFileName(file);
        var extension = Path.GetExtension(file);
        var contentType = MimeTypeMap.GetMimeType(extension);

        // create a bucket object
        var bucketObject = new BucketObject(fileName, new BucketObjectArgs
        {
            Acl = "public-read",
            Bucket = bucket.BucketName,
            ContentType = contentType,
            Source = new FileAsset(file)
        }, new CustomResourceOptions {Parent = bucket});
    }

    // export the endpoint of the bucket 
    return new Dictionary<string, object?>
    {
        ["endpoint"] = Output.Format($"http://{bucket.WebsiteEndpoint}")
    };
});
