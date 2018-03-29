# Serverless URL Shortener

A sample URL shortener SPA that uses the high-level `cloud.Table` and `cloud.HttpEndpoint` components. The example shows to combine both deployment time and runtime code in one program.

## Deploying and running the program

1. Run `pulumi init`. (Note: this command will not be required in a future SDK release.)

1. Create a new stack:

    ```
    $ pulumi stack init
    Enter a stack name: url-shortener-test
    ```

1. Set the provider and region:

    ```
    $ pulumi config set cloud:provider aws
    $ pulumi config set aws:region us-west-2
    ```

1. Compile the program via `tsc` or `npm run build`.

1. Preview the program deployment:

    ```
    $ pulumi preview
    [...details omitted...]
    ---outputs:---
    endpointUrl: computed<string>
    info: 48 changes previewed:
        + 48 resources to create
    ```

1. Perform the deployment:

    ```
    $ pulumi update
    [...details omitted...]
    ---outputs:---
    endpointUrl: "https://gs8t66u634.execute-api.us-east-1.amazonaws.com/stage/"
    info: 48 changes performed:
        + 48 resources created
    Update duration: 4m7.023449447s
    ```

1. The API endpoint will be shown as the value for `endpointUrl` in the CLI output. You can always get this value by running `pulumi stack output`:

    ```
    $ pulumi stack output endpointUrl
    https://gs8t66u634.execute-api.us-east-1.amazonaws.com/stage/
    ```

1. Open this page in a browser and you'll see a single page app for creating and viewing short URLs.

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

### Delete resources

When you're done, run `pulumi destroy` to delete the program's resources:

```
$ pulumi destroy
This will permanently destroy all resources in the 'url-shortener-test' stack!
Please confirm that this is what you'd like to do by typing ("url-shortener-test"): url-shortener-test
```

## About the code

This example combines deployment time and runtime code in the same application. In [index.ts](./index.ts), there are two resource definitions at the top:

```typescript
// Create a web server.
let endpoint = new cloud.HttpEndpoint("urlshortener");

// Create a table `urls`, with `name` as primary key.
let urlTable = new cloud.Table("urls", "name");
```

During `pulumi update`, the declaration `new cloud.HttpEndpoint` provisions an AWS API Gateway resource and `new cloud.Table` provisions a Dynamo DB instance. To learn more about how this works, see [How Pulumi Works](https://docs.pulumi.com/reference/how.html) in the documentation.

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

To learn more about runtime and deployment time code, see [Programming Model](https://docs.pulumi.com/reference/programming-model.html) in the Pulumi documentation.
