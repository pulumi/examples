package main

import (
	"io/fs"
	"mime"
	"path"
	"path/filepath"
	"reflect"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/s3"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type Folder struct {
	pulumi.ResourceState

	bucketName pulumi.IDOutput     `pulumi:"bucketName"`
	websiteUrl pulumi.StringOutput `pulumi:"websiteUrl"`
}

func NewS3Folder(ctx *pulumi.Context, bucketName string, siteDir string, args *FolderArgs, opts ...pulumi.ResourceOption) (*Folder, error) {
	var resource Folder
	// Stack exports
	err := ctx.RegisterComponentResource("pulumi:example:S3Folder", bucketName, &resource, opts...)
	if err != nil {
		return nil, err
	}
	// Create a bucket and expose a website index document
	siteBucket, err := s3.NewBucket(ctx, bucketName, &s3.BucketArgs{
		Website: s3.BucketWebsiteArgs{
			IndexDocument: pulumi.String("index.html"),
		},
	}, pulumi.Parent(&resource))
	if err != nil {
		return nil, err
	}

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
			}, pulumi.Parent(&resource)); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	// Allow public ACLs for the bucket
	accessBlock, err := s3.NewBucketPublicAccessBlock(ctx, "public-access-block", &s3.BucketPublicAccessBlockArgs{
		Bucket:          siteBucket.ID(),
		BlockPublicAcls: pulumi.Bool(false),
	})
	if err != nil {
		return nil, err
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
	}, pulumi.Parent(&resource), pulumi.DependsOn([]pulumi.Resource{accessBlock})); err != nil {
		return nil, err
	}
	resource.bucketName = siteBucket.ID()
	resource.websiteUrl = siteBucket.WebsiteEndpoint
	ctx.RegisterResourceOutputs(&resource, pulumi.Map{
		"bucketName": siteBucket.ID(),
		"websiteUrl": siteBucket.WebsiteEndpoint,
	})
	return &resource, nil
}

type folderArgs struct {
}

type FolderArgs struct {
}

func (FolderArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*folderArgs)(nil)).Elem()
}
