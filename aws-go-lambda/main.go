package main

import (
	"github.com/pulumi/pulumi-aws/sdk/go/aws/iam"
	"github.com/pulumi/pulumi-aws/sdk/go/aws/lambda"
	"github.com/pulumi/pulumi/sdk/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Create an IAM role.
		role, err := iam.NewRole(ctx, "task-exec-role", &iam.RoleArgs{
			AssumeRolePolicy: pulumi.String(`{
				"Version": "2012-10-17",
				"Statement": [{
					"Sid": "",
					"Effect": "Allow",
					"Principal": {
						"Service": "lambda.amazonaws.com"
					},
					"Action": "sts:AssumeRole"
				}]
			}`),
		})
		if err != nil {
			return err
		}

		// Set arguments for constructing the function resource.
		args := &lambda.FunctionArgs{
			Handler: pulumi.String("handler"),
			Role:    role.Arn,
			Runtime: pulumi.String("go1.x"),
			Code:    pulumi.NewFileArchive("./handler/handler.zip"),
		}

		// Create the lambda using the args.
		function, err := lambda.NewFunction(ctx, "basicLambda", args)
		if err != nil {
			return err
		}

		// Stack exports
		ctx.Export("lambda", function.Arn)

		return nil
	})
}
