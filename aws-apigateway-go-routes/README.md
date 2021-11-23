[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Routes in API Gateway

This example create an API Gateway which responds to requests using different sources:

1. Static files from a directory
2. Lambda Function
3. HTTP Proxy

When you're finished, you'll be familiar with how to configure routes in API Gateway using the RestAPI.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Go](https://www.pulumi.com/docs/intro/languages/go/)

## Deploy the App

### Step 1: Create a directory and cd into it

For Pulumi examples, we typically start by creating a directory and changing into it. Then, we create a new Pulumi project from a template. For example, `azure-javascript`.

1. Install prerequisites:

    ```bash
    go install
    ```

2. Create a new Pulumi stack:

    ```bash
    pulumi stack init
    ```

3. Configure the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-east-2
    ```

4. Deploy the Pulumi stack:

    ```bash
    pulumi up
    ```

### Step 2: Test your API

Use the example CURL commands to test the API responses.

```bash
$ curl -w '\n' "$(pulumi stack output url)static"
<h1>Hello Pulumi!</h1>

$ curl -w '\n' "$(pulumi stack output url)lambda"
Hello, API Gateway!

$ python3 -m webbrowser "$(pulumi stack output url)proxy"
# Opens a page looking like Google in your browser

$ curl -w '\n' -H "Authorization: HEADER.PAYLOAD.SIGNATURE" "$(pulumi s
tack output url)cognito-authorized"
{"message":"Unauthorized"}

$ curl -w '\n' -H "Authorization: goodToken" "$(pulumi stack output url)lambda-authorized"
Hello, API Gateway!

$ curl -w '\n' -H "Authorization: badToken" "$(pulumi stack output url)lambda-authorized"
{"message": "404 Not found" }

$ curl -w '\n' "$(pulumi stack output url)lambda-authorized" # No token
{"message":"Unauthorized"}
```

Fetch and review the logs from the Lambda executions:

```bash
pulumi logs
```

## Clean Up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```

## Summary

In this tutorial, you deployed an API with different route configurations. Now you can use these patterns to build real APIs which connect to other services.
