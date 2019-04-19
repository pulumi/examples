[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Auth0 Protected Serverless REST API on AWS

A simple REST API that is protected by a custom AWS Lambda Authorizer. The Authorizer uses [Auth0](https://auth0.com/) to authorize requests.

This example is similar to Auth0's tutorial: [Secure AWS API Gateway Endpoints Using Custom Authorizers](https://auth0.com/docs/integrations/aws-api-gateway/custom-authorizers), but uses Pulumi to create the Serverless app and Custom Authorizer.

## Set Up Auth0

You can follow the steps below or alternatively you can follow [Auth0's Part 1: Create an Auth0 API](https://auth0.com/docs/integrations/aws-api-gateway/custom-authorizers/part-1).

1. [Sign up](https://auth0.com/signup) for an Auth0 account or login if you already have one.

1. Click on `APIs` in the left-hand menu.

1. Click `Create API`.

    * Enter a name and Identifier for you New API.
    * Select RS256 as the Signing Algorithm.
    * Click `Create`.

1. Under the `Quick Start` tab, the Node.js example will show you the values for `jwksUri`, `audience` and `issuer` you will need in the next section.

## Deploying and Running the Program

1. Create a new stack:

    ```bash
    pulumi stack init auth0-api-testing
    ```

1. Set the AWS region:

    ```bash
    pulumi config set aws:region us-east-2
    ```

1. Set up the Auth0 configuration values as secrets in Pulumi:

    Run the following commands after replacing `<jwksUri>`, `<audience>` and `<issuer>` with the appropriate values.

    ```bash
    pulumi config set jwksUri <jwksUri> --secret
    pulumi config set audience <audience> --secret
    pulumi config set issuer <issuer> --secret
    ```

1. Restore NPM modules via `npm install` or `yarn install`.

1. Run `pulumi up` to preview and deploy changes:

## Clean up

1. Run `pulumi destroy` to tear down all resources.

1. To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi Console.
