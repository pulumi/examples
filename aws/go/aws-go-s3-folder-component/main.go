package main

import (
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Create a bucket and expose a website index document
		f, err := NewS3Folder(ctx, "pulumi-static-site", "./www", &FolderArgs{})
		if err != nil {
			return err
		}
		ctx.Export("bucketName", f.bucketName)
		ctx.Export("websiteUrl", f.websiteUrl)
		return nil
	})
}
