[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# serverless-raw

This example deploys a complete serverless C# application using raw `aws.apigateway.RestAPI`, `aws.lambda.Function` and
`aws.dynamodb.Table` resources from `@pulumi/aws`.  Although this doesn't feature any of the higher-level abstractions
from the `@pulumi/cloud` package, it demonstrates that you can program the raw resources directly available in AWS
to accomplish all of the same things this higher-level package offers.

The deployed Lambda function is a simple C# application, highlighting the ability to manage existing application code
in a Pulumi application, even if your Pulumi code is written in a different language like JavaScript or Python.

The Lambda function is a C# application using .NET Core 2.1 (a similar approach works for any other language supported by
AWS Lambda).  To deploy the complete application:

```bash
# Create and configure a new stack
$ pulumi stack init testing
$ pulumi config set aws:region us-east-2

# Install dependencies
$ npm install

# Build the C# app
$ cd ./app
$ dotnet publish
$ cd ..

# Preview and run the deployment
$ pulumi up
Previewing changes:
...
Performing changes:
...
info: 9 changes performed:
    + 9 resources created
Update duration: 25.017340162s

# Test it out
$ curl $(pulumi stack output endpoint)/hello
{"Path":"/hello","Count":0}

# See the logs
$ pulumi logs -f
 2018-03-21T18:24:52.670-07:00[    mylambda-d719650] START RequestId: d1e95652-2d6f-11e8-93f6-2921c8ae65e7 Version: $LATEST
 2018-03-21T18:24:56.171-07:00[    mylambda-d719650] Getting count for '/hello'
 2018-03-21T18:25:01.327-07:00[    mylambda-d719650] Got count 0 for '/hello'
 2018-03-21T18:25:02.267-07:00[    mylambda-d719650] END RequestId: d1e95652-2d6f-11e8-93f6-2921c8ae65e7
 2018-03-21T18:25:02.267-07:00[    mylambda-d719650] REPORT RequestId: d1e95652-2d6f-11e8-93f6-2921c8ae65e7   Duration: 9540.93 ms    Billed Duration: 9600 ms        Memory Size: 128 MB     Max Memory Used: 37 MB

# Remove the app
$ pulumi destroy
```
