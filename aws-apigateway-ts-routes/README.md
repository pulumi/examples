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

3. Deploy the Pulumi stack:

    ```bash
    pulumi up
    ```

### Step 2: Test your API

Use the example CURL commands to test the API responses.

```bash
$ curl -w '\n' $(pulumi stack output url)
> {"message":"Unauthorized"}
$ curl -w '\n' -H "Authorization: goodToken" $(pulumi stack output url)
> <h1>Hello Pulumi!</h1>
$ curl -w '\n' -H "Authorization: badToken" $(pulumi stack output url)
> {"message": "404 Not found" }
```


### Step 3: Tidy up

Once you're finished experimenting, you can destroy your stack and remove it:

```bash
pulumi destroy --yes
pulumi stack rm --yes
```

## Clean Up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy --yes
pulumi stack rm --yes
```

## Summary

In this tutorial, you [configured/set up/built/deployed] [something]. Now you can....

<!-- Give a quick recap of what the readers have learned and optionally provide places for further exploration. -->

## Next Steps

<!-- Optionally include an unordered list of relevant Pulumi tutorials. -->

<!-- Example:
- [Create a load-balanced, hosted NGINX container service](https://www.pulumi.com/docs/tutorials/aws/ecs-fargate/)
- [Create an EC2-based WebServer and associated infrastructure](https://www.pulumi.com/docs/tutorials/aws/ec2-webserver/)
-->
