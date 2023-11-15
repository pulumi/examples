package main

import (
	"github.com/pulumi/pulumi-gcp/sdk/v7/go/gcp/cloudfunctions"
	"github.com/pulumi/pulumi-gcp/sdk/v7/go/gcp/storage"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Create a bucket.
		bucket, err := storage.NewBucket(ctx, "bucket", nil)
		if err != nil {
			return err
		}

		// Create an object in our bucket with our function.
		bucketObjectArgs := &storage.BucketObjectArgs{
			Bucket: bucket.Name,
			Source: pulumi.NewFileArchive("pythonfunc"),
		}
		bucketObject, err := storage.NewBucketObject(ctx, "python-zip", bucketObjectArgs)
		if err != nil {
			return err
		}

		// Set arguments for creating the function resource.
		args := &cloudfunctions.FunctionArgs{
			SourceArchiveBucket: bucket.Name,
			Runtime:             pulumi.String("python37"),
			SourceArchiveObject: bucketObject.Name,
			EntryPoint:          pulumi.String("handler"),
			TriggerHttp:         pulumi.Bool(true),
			AvailableMemoryMb:   pulumi.Int(128),
		}

		// Create the function using the args.
		function, err := cloudfunctions.NewFunction(ctx, "basicFunction", args)
		if err != nil {
			return err
		}

		_, err = cloudfunctions.NewFunctionIamMember(ctx, "invoker", &cloudfunctions.FunctionIamMemberArgs{
			Project:       function.Project,
			Region:        function.Region,
			CloudFunction: function.Name,
			Role:          pulumi.String("roles/cloudfunctions.invoker"),
			Member:        pulumi.String("allUsers"),
		})
		if err != nil {
			return err
		}

		// Export the trigger URL.
		ctx.Export("function", function.HttpsTriggerUrl)
		return nil
	})
}
