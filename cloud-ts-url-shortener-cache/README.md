# Serverless URL Shortener with Redis Cache

A sample URL shortener SPA that uses the high-level `cloud.Table` and `cloud.HttpEndpoint` components. The example shows to combine serverless functions along with containers.

## Deploying and running the program

1.  Initialize a Pulumi repository with pulumi init, using your GitHub username. (Note: this step will be removed in the future.)

    ```
    $ pulumi init --owner githubUsername
    ```

1. Create a new stack:

    ```
    $ pulumi stack init testing
    ```

1. Set the provider and region:

    ```
    $ pulumi config set cloud:provider aws
    $ pulumi config set aws:region us-west-2
    ```

1. Set a value for the Redis password. The value can be an encrypted secret, specified with the `--secret` flag. If this flag is not provided, the value will be saved as plaintext in `Pulumi.testing.yaml` (since `testing` is the current stack name).

    ```
    $ pulumi config set --secret redisPassword S3cr37Password
    Enter your passphrase to protect config/secrets: 
    Re-enter your passphrase to confirm:     
    ```

1. Restore NPM modules via `npm install`.

1. Compile the program via `tsc` or `npm run build`.

1. Preview the program deployment:



1. Perform the deployment:

1. To view the API endpoint, use the `stack output` command:

    ```
    $ pulumi stack output endpointUrl
    https://gs8t66u634.execute-api.us-east-1.amazonaws.com/stage/
    ```

1. Open this page in a browser and you'll see a single page app for creating and viewing short URLs.


