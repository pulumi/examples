[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-lambda-gateway/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-lambda-gateway/README.md#gh-dark-mode-only)

# AWS Golang Lambda with API Gateway

This example creates a lambda that does a simple `ToUpper` on the path input of an API request and returns it.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
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
            go build -o handler\handler handler\handler.go
            %USERPROFILE%\Go\bin\build-lambda-zip.exe -o handler\handler.zip handler\handler
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
    pulumi config set aws:region us-west-2
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev):
        Type                           Name               Status
    +   pulumi:pulumi:Stack            go-lambda-dev      created
    +   ├─ aws:apigateway:RestApi      UpperCaseGateway   created
    +   ├─ aws:iam:Role                task-exec-role     created
    +   ├─ aws:apigateway:Resource     UpperAPI           created
    +   ├─ aws:iam:RolePolicy          lambda-log-policy  created
    +   ├─ aws:apigateway:Method       AnyMethod          created
    +   ├─ aws:lambda:Function         basicLambda        created
    +   ├─ aws:apigateway:Integration  LambdaIntegration  created
    +   ├─ aws:lambda:Permission       APIPermission      created
    +   └─ aws:apigateway:Deployment   APIDeployment      created

    Outputs:
        invocation URL: "https://<gateway-id>.execute-api.us-west-2.amazonaws.com/prod/{message}"

    Resources:
        + 10 created

    Duration: 29s
    ```

1. Call the Lambda function from the CLI:

    ```bash
    curl https://<gateway-id>.execute-api.us-west-2.amazonaws.com/prod/helloworld
    ```

    ```
    HELLOWORLD
    ```

   From there, feel free to experiment. Simply making edits, rebuilding your handler, and running `pulumi up` will update your lambda.

## Cleaning up

Once you're finished experimenting, tear down your stack's resources by destroying and removing it:

```bash
pulumi destroy
pulumi stack rm
```
