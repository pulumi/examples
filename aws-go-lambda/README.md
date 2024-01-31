[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-lambda/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-lambda/README.md#gh-dark-mode-only)

# AWS Golang Lambda
This example creates an AWS Lambda function that does a simple `ToUpper` on the string input and returns it.

## Deploying the App

 To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Clone aws-go-lambda](https://github.com/aws/aws-lambda-go)

### Steps

After cloning this repo, run these commands from the working directory:

1. Build the handler:

	- For developers on Linux and macOS:

		```bash
		make build
		```

	- For developers on Windows:

		- Get the `build-lambda-zip` tool:

			```bash
			set GO111MODULE=on
			go.exe get -u github.com/aws/aws-lambda-go/cmd/build-lambda-zip
			```

		- Use the tool from your GOPATH:

			```bash
			set GOOS=linux
			set GOARCH=amd64
			set CGO_ENABLED=0
			go build -o handler\handler handler\handler.go
			%USERPROFILE%\Go\bin\build-lambda-zip.exe -o handler\handler.zip handler\handler
			```


2. Create a new Pulumi stack, which is an isolated deployment target for this example:

	```bash
	pulumi stack init
	```

3. Set the required configuration variables for this program:

	```bash
	pulumi config set aws:region us-east-1
	```

4. Execute the Pulumi program to create our lambda:

	```bash
	pulumi up
	```

5. Call our Lambda function from the AWS CLI with "foo" as the payload:

	```bash
	aws lambda invoke \
	--function-name $(pulumi stack output lambda) \
	--region $(pulumi config get aws:region) \
	--cli-binary-format raw-in-base64-out \
	--payload '"foo"' \
	output.json

	cat output.json # view the output file with your tool of choice
	# "FOO"
	```

6. From there, feel free to experiment. Simply making edits, rebuilding your handler, and running `pulumi up` will update your function.

7. Afterwards, destroy your stack and remove it:

	```bash
	pulumi destroy --yes
	pulumi stack rm --yes
	```
