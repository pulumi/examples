[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-serverless-raw/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-serverless-raw/README.md#gh-dark-mode-only)

# Google Cloud Functions in Python, Go, and TypeScript Deployed with TypeScript

This example deploys three Google Cloud Functions. "Hello World" functions are implemented in Python, Go, and TypeScript. Pulumi program is implemented in TypeScript.

```bash
# Create and configure a new stack
$ pulumi stack init testing
$ pulumi config set gcp:project <your-gcp-project>
$ pulumi config set gcp:region <gcp-region>

# Install dependencies
$ npm install

# Preview and run the deployment
$ pulumi up
Previewing changes:
...
Performing changes:
...
info: 6 changes performed:
    + 6 resources created
Update duration: 1m14s

# Test it out
$ curl $(pulumi stack output pythonEndpoint)
"Hello World!"
$ curl $(pulumi stack output goEndpoint)
"Hello World!"
$ curl $(pulumi stack output tsEndpoint)
"Hello World!"

# Remove the app
$ pulumi destroy
```

## TypeScript Notes

In the `typescriptfunc` folder you'll notice more than a function. Some configuration is needed to inform GCP how to build TypeScript for the Node.js runtime environment. See [this example from Google for more details](https://github.com/GoogleCloudPlatform/functions-framework-nodejs/blob/master/docs/typescript.md).
