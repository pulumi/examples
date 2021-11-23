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
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploy the App

### Step 1: Create a directory and cd into it

For Pulumi examples, we typically start by creating a directory and changing into it. Then, we create a new Pulumi project from a template. For example, `azure-javascript`.

1. Install prerequisites:

    ```bash
    npm install
    ```

    or

    ```bash
    yarn install
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

Testing a valid Cognito token is a little more involved.

1. Create a random password

    ```bash
    PASSWORD=$(curl https://www.passwordrandom.com/query?command=password&scheme=Llnn%23rrrrrrrrrr)
    ```

2. Create a user

    ```bash
    aws cognito-idp sign-up --region $(pulumi config get aws:region) --client-id $(pulumi stack output user_pool_client_id) --username "test@domain.example" --password "$PASSWORD"
    ```

3. Confirm the user's account

    ```bash
    aws cognito-idp admin-confirm-sign-up --region $(pulumi config get aws:region) --user-pool-id $(pulumi stack output user_pool_id) --username "test@domain.example"
    ```

4. Authenticate to create a new session:

    ```bash
    TOKEN=$(aws cognito-idp admin-initiate-auth --region $(pulumi config get aws:region) --user-pool-id $(pulumi stack output user_pool_id) --client-id $(pulumi stack output user_pool_client_id) --auth-flow ADMIN_NO_SRP_AUTH --auth-parameters "{\"USERNAME\":\"test@domain.example\",\"PASSWORD\":\"$PASSWORD\"}")
    ```

5. Perform authenticated request

    ```bash
    $ curl -w '\n' -H "Authorization: $(echo $TOKEN | jq '.AuthenticationResult.IdToken' -r)" "$(pulumi stack output url)cognito-authorized"
    Hello, API Gateway!
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
