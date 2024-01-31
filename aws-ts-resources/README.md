[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-resources/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-resources/README.md#gh-dark-mode-only)

# AWS Resources

A Pulumi program that demonstrates creating various AWS resources.

```bash
# Create and configure a new stack
$ pulumi stack init aws-resources-dev
$ pulumi config set aws:region us-east-2

# Install dependencies
$ npm install

# Preview and run the deployment
$ pulumi up

# Remove the app
$ pulumi destroy
$ pulumi stack rm
```
