[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Google Cloud Functions in Python and Go Deployed with TypeScript

This example deploys two Google Cloud Functions. "Hello World" functions are implemented in Python and Go. Pulumi program is implemented in TypeScript.

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

# Remove the app
$ pulumi destroy
```
