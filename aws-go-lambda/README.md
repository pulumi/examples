[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-lambda/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-lambda/README.md#gh-dark-mode-only)

# AWS Golang Lambda

This example creates an AWS Lambda function that does a simple `ToUpper` on the string input and returns it.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Go](https://www.pulumi.com/docs/intro/languages/go/)

## Deploying the example

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
            go build -o handler\bootstrap handler\handler.go
            %USERPROFILE%\Go\bin\build-lambda-zip.exe -o handler\handler.zip handler\bootstrap
            ```

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init
    ```

1. Install dependencies:

    ```bash
    go mod download
    ```

1. Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-east-1
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

1. Call the Lambda function from the AWS CLI with "foo" as the payload:

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

   From there, feel free to experiment. Simply making edits, rebuilding your handler, and running `pulumi up` will update your function.

## Cleaning up

Once you're finished experimenting, tear down your stack's resources by destroying and removing it:

```bash
pulumi destroy
pulumi stack rm
```
