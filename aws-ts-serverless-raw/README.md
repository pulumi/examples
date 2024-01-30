[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-serverless-raw/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-serverless-raw/README.md#gh-dark-mode-only)

# Serverless C# App

This example deploys a complete serverless C# application using raw `aws.apigateway.RestAPI`, `aws.lambda.Function` and
`aws.dynamodb.Table` resources from `@pulumi/aws`.  Although this doesn't feature any of the higher-level abstractions
from the `@pulumi/cloud` package, it demonstrates that you can program the raw resources directly available in AWS
to accomplish all of the same things this higher-level package offers.

The deployed Lambda function is a simple C# application, highlighting the ability to manage existing application code
in a Pulumi application, even if your Pulumi code is written in a different language like JavaScript or Python.

The Lambda function is a C# application using .NET Core 3.1 (a similar approach works for any other language supported by
AWS Lambda).

## Deploying and running the Pulumi App

1.  Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1.  Restore NPM modules via `npm install` or `yarn install`.

1.  Build the C# application.

    ```bash
    dotnet publish app
    ```

1.  Set the AWS region:

    ```bash
    $ pulumi config set aws:region us-east-2
    ```

1.  Optionally, set AWS Lambda provisioned concurrency:

    ```bash
    $ pulumi config set provisionedConcurrency 1
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing update (dev):
    ...

    Updating (dev):
    ...
    Resources:
        + 10 created
    Duration: 1m 20s
    ```

1.  Check the deployed GraphQL endpoint:

    ```
    $ curl $(pulumi stack output endpoint)/hello
    {"Path":"/hello","Count":0}
    ```

1.  See the logs

    ```
    $ pulumi logs -f
    2018-03-21T18:24:52.670-07:00[    mylambda-d719650] START RequestId: d1e95652-2d6f-11e8-93f6-2921c8ae65e7 Version: $LATEST
    2018-03-21T18:24:56.171-07:00[    mylambda-d719650] Getting count for '/hello'
    2018-03-21T18:25:01.327-07:00[    mylambda-d719650] Got count 0 for '/hello'
    2018-03-21T18:25:02.267-07:00[    mylambda-d719650] END RequestId: d1e95652-2d6f-11e8-93f6-2921c8ae65e7
    2018-03-21T18:25:02.267-07:00[    mylambda-d719650] REPORT RequestId: d1e95652-2d6f-11e8-93f6-2921c8ae65e7   Duration: 9540.93 ms    Billed Duration: 9600 ms        Memory Size: 128 MB     Max Memory Used: 37 MB
    ```

## Clean up

1.  Run `pulumi destroy` to tear down all resources.

1.  To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi console.
