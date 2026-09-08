[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-console-slack-notification/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-console-slack-notification/README.md#gh-dark-mode-only)

# AWS Console change Slack notifier in Go

This example deploys a Lambda function and relevant CloudTrail and CloudWatch resources to send a
Slack notification for any resource operation that is performed via the AWS Console.

Note: This application sets up the necessary infrastructure across _each_ AWS region in your
account that is `opt-in-not-required` or `opted-in`. The Pulumi application uses the
[DescribeRegions](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeRegions.html) API
via [aws-sdk-go](https://github.com/aws/aws-sdk-go) to query for available regions.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Go](https://www.pulumi.com/docs/intro/languages/go/)

## Deploying the example

1. Build the handler:

    - For developers on Linux and macOS:

        ```bash
        make
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
            go build -o handler\dist\handler handler\handler.go
            %USERPROFILE%\Go\bin\build-lambda-zip.exe -o handler\dist\handler.zip handler\dist\handler
            ```

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init
    ```

1. Install dependencies:

    ```bash
    go mod download
    ```

1. Set the required configuration variables for this program:

    ```bash
    pulumi config set slackWebhookURL 'YOUR_SLACK_WEBHOOK_URL' --secret
    ```

    Optionally, customize the Slack message username or text:

    ```bash
    pulumi config set slackMessageUsername 'Console Change Monitor'
    pulumi config set slackMessageText ':warning: Somebody made a change in the console!'
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

1. Perform a change in the AWS Console and look for a notification in your Slack channel. Note: you
   must perform a _write_ such as adding or removing tags from a resource, launching an instance, or
   deleting a resource.

   From there, feel free to experiment. Simply making edits, rebuilding your handler, and running
   `pulumi up` will update your Lambda.

## Cleaning up

Once you're finished experimenting, tear down your stack's resources by destroying and removing it:

```bash
pulumi destroy
pulumi stack rm
```
