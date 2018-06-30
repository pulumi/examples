# AWS Resources

A Pulumi program that demonstrates creating various AWS resources.

```bash
# Create and configure a new stack
$ pulumi stack init aws-resources-dev
$ pulumi config set aws:region us-east-2

# Install dependencies
$ npm install

# Compile the TypeScript program
npm run build

# Preview and run the deployment
$ pulumi update

# Remove the app
$ pulumi destroy
```
