using System.Collections.Generic;
using System.Threading.Tasks;

using Pulumi;
using Pulumi.Gcp.CloudFunctions;
using Pulumi.Gcp.Storage;

class Program
{
    static Task<int> Main()
    {
        return Deployment.RunAsync(() => {

            var bucket = new Bucket("bucket");

            var bucketObject = new BucketObject("python-zip", new BucketObjectArgs
            {
                Bucket = bucket.Name,
                Source = new FileArchive("./pythonfunc")
            });

            var function = new Function("python-func", new FunctionArgs
            {
                SourceArchiveBucket = bucket.Name,
                Runtime = "python37",
                SourceArchiveObject = bucketObject.Name,
                EntryPoint = "handler",
                TriggerHttp = true,
                AvailableMemoryMb = 128
            });

            // Export the URL of the function
            return new Dictionary<string, object?>
            {
                { "pythonEndpoint", function.HttpsTriggerUrl },
            };
        });
    }
}
