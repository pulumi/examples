[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/cloud-ts-url-shortener/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/cloud-ts-url-shortener/README.md#gh-dark-mode-only)

# Serverless URL Shortener

This example demonstrates a complete URL shortener web application using high-level `cloud.Table` and
`cloud.HttpEndpoint` components, highlighting the ability to combine deployment time and runtime code, and the simple,
cloud-agnostic, programming model of `@pulumi/cloud`.  Although we only support AWS today in this framework, our plan
is to offer an implementation of this on all major clouds, and so any code targeting this can truly run anywhere.

## Deploying and running the program

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1. Create a new stack:

    ```
    $ pulumi stack init url-shortener-test
    ```

1. Set the AWS region:

    ```
    $ pulumi config set aws:region us-west-2
    ```

1. Restore NPM modules via `npm install` or `yarn install`.

1. Preview and run the deployment via `pulumi up`. The operation will take about 2 minutes to
   complete and will create 34 resources:

    ```
    $ pulumi up
    Previewing update of stack 'url-shortener-dev'
    ...

    Do you want to perform this update? yes
    Updating stack 'url-shortener-dev'
    Performing changes:

        Type                                      Name                                    Status      Info
    +   pulumi:pulumi:Stack                       url-shortener-url-shortener-dev         created
    +   ├─ cloud:table:Table                      urls                                    created
    +   │  └─ aws:dynamodb:Table                  urls                                    created
    +   └─ cloud:http:HttpEndpoint                urlshortener                            created
    +      ├─ aws:s3:Bucket                       urlshortener                            created
    +      ├─ aws:iam:Role                        urlshortener4c238266                    created
    +      ├─ cloud:function:Function             urlshortener0f7d8d8d                    created
    +      │  └─ aws:serverless:Function          urlshortener0f7d8d8d                    created
    +      │     ├─ aws:iam:Role                  urlshortener0f7d8d8d                    created
    +      │     ├─ aws:iam:RolePolicyAttachment  urlshortener0f7d8d8d-32be53a2           created
    +      │     ├─ aws:iam:RolePolicyAttachment  urlshortener0f7d8d8d-fd1a00e5           created
    +      │     └─ aws:lambda:Function           urlshortener0f7d8d8d                    created
    +      ├─ cloud:function:Function             urlshortenerd9505e4a                    created
    +      │  └─ aws:serverless:Function          urlshortenerd9505e4a                    created
    +      │     ├─ aws:iam:Role                  urlshortenerd9505e4a                    created
    +      │     ├─ aws:iam:RolePolicyAttachment  urlshortenerd9505e4a-32be53a2           created
    +      │     ├─ aws:iam:RolePolicyAttachment  urlshortenerd9505e4a-fd1a00e5           created
    +      │     └─ aws:lambda:Function           urlshortenerd9505e4a                    created
    +      ├─ cloud:function:Function             urlshortenereeb67ce9                    created
    +      │  └─ aws:serverless:Function          urlshortenereeb67ce9                    created
    +      │     ├─ aws:iam:Role                  urlshortenereeb67ce9                    created
    +      │     ├─ aws:iam:RolePolicyAttachment  urlshortenereeb67ce9-32be53a2           created
    +      │     ├─ aws:iam:RolePolicyAttachment  urlshortenereeb67ce9-fd1a00e5           created
    +      │     └─ aws:lambda:Function           urlshortenereeb67ce9                    created
    +      ├─ aws:s3:BucketObject                 urlshortener4c238266/bootstrap.min.css  created
    +      ├─ aws:s3:BucketObject                 urlshortener4c238266/favicon.png        created
    +      ├─ aws:s3:BucketObject                 urlshortener4c238266/index.html         created
    +      ├─ aws:iam:RolePolicyAttachment        urlshortener4c238266                    created
    +      ├─ aws:apigateway:RestApi              urlshortener                            created
    +      ├─ aws:apigateway:Deployment           urlshortener                            created
    +      ├─ aws:lambda:Permission               urlshortener-0f7d8d8d                   created
    +      ├─ aws:lambda:Permission               urlshortener-eeb67ce9                   created
    +      ├─ aws:lambda:Permission               urlshortener-d9505e4a                   created
    +      └─ aws:apigateway:Stage                urlshortener                            created

    ---outputs:---
    endpointUrl: "https://***.us-west-2.amazonaws.com/stage/"

    info: 34 changes performed:
        + 34 resources created
    Update duration: ***

    Permalink: https://app.pulumi.com/***
    ```

1. To view the url for the API endpoint, run `pulumi stack output`:

    ```
    $ pulumi stack output endpointUrl
    https://***.us-east-1.amazonaws.com/stage/
    ```

1. Open the URL in a browser and you'll see a single page app for creating and viewing short URLs.

### Logging

To view aggregated logs of the running application, use the `pulumi logs` command. These are logs across all of the compute for the application---in this case, 3 Lambda functions. To view a log stream, use the `--follow` flag:

```
$ pulumi logs --follow
Collecting logs since 2018-03-27T18:20:32.000-07:00.

 2018-03-27T19:20:23.300-07:00[          urlshortener0f7d8d8d] GET /url retrieved 0 items
 2018-03-27T19:20:29.500-07:00[          urlshortenereeb67ce9] POST /url/a => https://www.lindydonna.com
 2018-03-27T19:20:29.885-07:00[          urlshortener0f7d8d8d] GET /url retrieved 1 items
 2018-03-27T19:20:36.879-07:00[          urlshortener0f7d8d8d] GET /url retrieved 1 items
```

## Clean up

To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.

## About the code

This example combines deployment time and runtime code in the same application. In [index.ts](./index.ts), there are two resource definitions at the top:

```typescript
// Create a web server.
let endpoint = new cloud.API("urlshortener");

// Create a table `urls`, with `name` as primary key.
let urlTable = new cloud.Table("urls", "name");
```

During `pulumi up`, the declaration `new cloud.API` provisions an AWS API Gateway resource and `new cloud.Table` provisions a Dynamo DB instance. To learn more about how this works, see [How Pulumi Works](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) in the documentation.

The `endpoint.get` and `endpoint.post` method calls cause Pulumi to register API routes on the API Gateway, pointing to an AWS Lambda function for each implementation:

```typescript
endpoint.get("/url", async (req, res) => { // this function is the body of the Lambda
    try {
        let items = await urlTable.scan();  // reference outer urlTable definition
        res.status(200).json(items);
        console.log(`GET /url retrieved ${items.length} items`);
    } catch (err) {
        res.status(500).json(err.stack);
        console.log(`GET /url error: ${err.stack}`);
    }
});
```

Pulumi creates a Lambda function that contains the anonymous function passed to `endpoint.get`. Note that the value of `urlTable` is "captured." This means that `urlTable.scan` is turned into an API call on Dynamo DB, using the physical identifier for `urlTable`. There's no need to store this information in an environment variable; Pulumi wires everything up for you.

To learn more about runtime and deployment time code, see [Architecture and Concepts](https://www.pulumi.com/docs/intro/concepts/) in the Pulumi documentation.
