[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-apigateway-go-routes/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-apigateway-go-routes/README.md#gh-dark-mode-only)

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

2. Make Lambda handlers:

    ```bash
    make
    ```

3. Create a new Pulumi stack:

    ```bash
    pulumi stack init
    ```

4. Configure the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-east-2
    ```

5. Deploy the Pulumi stack:

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

$ curl -w '\n' "$(pulumi stack output url)swagger"
{
  "uuid": ...
}

$ curl -w '\n' -H "Authorization: HEADER.PAYLOAD.SIGNATURE" "$(pulumi stack output url)cognito-authorized"
{"message":"Unauthorized"}

$ curl -w '\n' -H "Authorization: goodToken" "$(pulumi stack output url)lambda-authorized"
Hello, API Gateway!

$ curl -w '\n' -H "Authorization: badToken" "$(pulumi stack output url)lambda-authorized"
{"message": "404 Not found" }

$ curl -w '\n' "$(pulumi stack output url)lambda-authorized" # No token
{"message":"Unauthorized"}

$ curl -w '\n' "$(pulumi stack output swagger-url)"
{
  "uuid": ...
}

$ curl -w '\n' -H "x-api-key: $(pulumi stack output apiKeyValue --show-secrets)" "$(pulumi stack output url)key-authorized"
Hello, API Gateway!
```

Testing a valid Cognito token is a little more involved.

1. Create a random password

    ```bash
    PASSWORD=$(curl -s https://www.passwordrandom.com/query?command=password&scheme=Llnn%23rrrrrrrrrr)
    ```

2. Create a user

    ```bash
    aws cognito-idp sign-up --region $(pulumi config get aws:region) --client-id $(pulumi stack output user-pool-client-id) --username "test@domain.example" --password "$PASSWORD"
    ```

3. Confirm the user's account

    ```bash
    aws cognito-idp admin-confirm-sign-up --region $(pulumi config get aws:region) --user-pool-id $(pulumi stack output user-pool-id) --username "test@domain.example"
    ```

4. Authenticate to create a new session:

    ```bash
    TOKEN=$(aws cognito-idp admin-initiate-auth --region $(pulumi config get aws:region) --user-pool-id $(pulumi stack output user-pool-id) --client-id $(pulumi stack output user-pool-client-id) --auth-flow ADMIN_NO_SRP_AUTH --auth-parameters "{\"USERNAME\":\"test@domain.example\",\"PASSWORD\":\"$PASSWORD\"}")
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

### Set Up Custom DNS

Before you can set up a custom domain you must [register a domain name with Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/registrar.html).

Configure the stack with your custom DNS information:

```bash
pulumi config set domain subdomain.acmecorp.example
pulumi config set dns-zone acmecorp.example
```

Deploy your stack:

```bash
$ pulumi up
...
     Type                               Name                            Plan
     pulumi:pulumi:Stack                aws-apigateway-ts-routes-dev
 +   ├─ pulumi:providers:aws            usEast1                         create
 +   ├─ aws:acm:Certificate             ssl-cert                        create
 +   ├─ aws:route53:Record              ssl-cert-validation-dns-record  create
 +   ├─ aws:acm:CertificateValidation   ssl-cert-validation             create
 +   ├─ aws:apigateway:DomainName       api-domain-name                 create
 +   ├─ aws:route53:Record              api-dns                         create
 +   └─ aws:apigateway:BasePathMapping  api-domain-mapping              create
```

Test your API is now available on your custom domain:

```bash
curl -w '\n' "$(pulumi stack output customUrl)static"
```

## Clean Up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```

## Summary

In this tutorial, you deployed an API with different route configurations. Now you can use these patterns to build real APIs which connect to other services.
