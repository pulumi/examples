package main

import (
	"io/fs"
	"mime"
	"path"
	"path/filepath"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/s3"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Create a bucket and expose a website index document
		siteBucket, err := s3.NewBucket(ctx, "s3-website-bucket", &s3.BucketArgs{
			Website: s3.BucketWebsiteArgs{
				IndexDocument: pulumi.String("index.html"),
			},
		})
		if err != nil {
			return err
		}

		siteDir := "www" // directory for content files

		// For each file in the directory, create an S3 object stored in `siteBucket`
		err = filepath.Walk(siteDir, func(name string, info fs.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if !info.IsDir() {
				rel, err := filepath.Rel(siteDir, name)
				if err != nil {
					return err
				}

				if _, err := s3.NewBucketObject(ctx, rel, &s3.BucketObjectArgs{
					Bucket:      siteBucket.ID(),                                     // reference to the s3.Bucket object
					Source:      pulumi.NewFileAsset(name),                           // use FileAsset to point to a file
					ContentType: pulumi.String(mime.TypeByExtension(path.Ext(name))), // set the MIME type of the file
				}); err != nil {
					return err
				}
			}
			return nil
		})
		if err != nil {
			return err
		}

		// Allow public ACLs for the bucket
		accessBlock, err := s3.NewBucketPublicAccessBlock(ctx, "public-access-block", &s3.BucketPublicAccessBlockArgs{
			Bucket:          siteBucket.ID(),
			BlockPublicAcls: pulumi.Bool(false),
		})
		if err != nil {
			return err
		}

		// Set the access policy for the bucket so all objects are readable.
		if _, err := s3.NewBucketPolicy(ctx, "bucketPolicy", &s3.BucketPolicyArgs{
			Bucket: siteBucket.ID(), // refer to the bucket created earlier
			Policy: pulumi.Any(map[string]interface{}{
				"Version": "2012-10-17",
				"Statement": []map[string]interface{}{
					{
						"Effect":    "Allow",
						"Principal": "*",
						"Action": []interface{}{
							"s3:GetObject",
						},
						"Resource": []interface{}{
							pulumi.Sprintf("arn:aws:s3:::%s/*", siteBucket.ID()), // policy refers to bucket name explicitly
						},
					},
				},
			}),
		}, pulumi.DependsOn([]pulumi.Resource{accessBlock})); err != nil {
			return err
		}

		// Stack exports
		ctx.Export("bucketName", siteBucket.ID())
		ctx.Export("websiteUrl", siteBucket.WebsiteEndpoint)
		return nil
	})
}
