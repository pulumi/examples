package main

import (
	"io/ioutil"
	"mime"
	"path"
	"path/filepath"
	"reflect"

	"github.com/pulumi/pulumi-aws/sdk/v3/go/aws/s3"
	"github.com/pulumi/pulumi/sdk/v2/go/pulumi"
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
	files, err := ioutil.ReadDir(siteDir)
	if err != nil {
		return nil, err
	}
	for _, item := range files {
		name := item.Name()
		s3.NewBucketObject(ctx, name, &s3.BucketObjectArgs{
			Bucket:      siteBucket.ID(),                                     // reference to the s3.Bucket object
			Source:      pulumi.NewFileAsset(filepath.Join(siteDir, name)),   // use FileAsset to point to a file
			ContentType: pulumi.String(mime.TypeByExtension(path.Ext(name))), // set the MIME type of the file
		}, pulumi.Parent(&resource))
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
	}, pulumi.Parent(&resource)); err != nil {
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
