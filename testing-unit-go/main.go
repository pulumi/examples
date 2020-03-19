package main

import (
	"github.com/pulumi/pulumi-aws/sdk/go/aws/s3"
	"github.com/pulumi/pulumi/sdk/go/pulumi"
)

// CreateBucket is the function we want to test.
func CreateBucket(ctx *pulumi.Context) (*s3.Bucket, error) {
	// Create an AWS resource (S3 Bucket)
	return s3.NewBucket(ctx, "my-bucket", nil)
}

func main() {
	pulumi.Run(func (ctx *pulumi.Context) error {
		bucket, err := CreateBucket(ctx)
		if err != nil {
			return err
		}

		// Export the name of the bucket
		ctx.Export("bucketName", bucket.ID())
		return nil
	})
}
