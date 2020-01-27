package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"mime"
	"path"
	"path/filepath"

	"github.com/pulumi/pulumi-aws/sdk/go/aws/s3"
	"github.com/pulumi/pulumi/sdk/go/pulumi"
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
		files, err := ioutil.ReadDir(siteDir)
		if err != nil {
			return err
		}
		for _, item := range files {
			name := item.Name()
			filePath := filepath.Join(siteDir, name)
			if _, err := s3.NewBucketObject(ctx, name, &s3.BucketObjectArgs{
				Bucket:      siteBucket.ID(),                                     // reference to the s3.Bucket object
				Source:      pulumi.NewFileAsset(filePath),                       // use FileAsset to point to a file
				ContentType: pulumi.String(mime.TypeByExtension(path.Ext(name))), // set the MIME type of the file
			}); err != nil {
				return err
			}
		}

		// Set the access policy for the bucket so all objects are readable
		if _, err := s3.NewBucketPolicy(ctx, "bucketPolicy", &s3.BucketPolicyArgs{
			Bucket: siteBucket.ID(),                                        // refer to the bucket created earlier
			Policy: siteBucket.ID().ApplyString(publicReadPolicyForBucket), // use output property `siteBucket.bucket`
		}); err != nil {
			return err
		}

		// Stack exports
		ctx.Export("bucketName", siteBucket.ID())
		ctx.Export("websiteUrl", siteBucket.WebsiteEndpoint)
		return nil
	})
}

// Create an S3 Bucket Policy to allow public read of all objects in bucket.
func publicReadPolicyForBucket(bucketName pulumi.ID) string {
	policy, _ := json.Marshal(map[string]interface{}{
		"Version": "2012-10-17",
		"Statement": []map[string]interface{}{
			{
				"Effect":    "Allow",
				"Principal": "*",
				"Action": []string{
					"s3:GetObject",
				},
				"Resource": []string{
					fmt.Sprintf("arn:aws:s3:::%s/*", bucketName), // policy refers to bucket name explicitly
				},
			},
		},
	})
	return string(policy)
}
