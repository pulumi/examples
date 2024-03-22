[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-apigateway-auth0/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-apigateway-auth0/README.md#gh-dark-mode-only)

# Secure Serverless REST API Using Auth0

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
    pulumi config set --secret jwksUri <jwksUri>
    pulumi config set --secret audience <audience>
    pulumi config set --secret issuer <issuer>
    ```

1. Restore NPM modules via `npm install` or `yarn install`.

1. Run `pulumi up` to preview and deploy changes:

```bash
$ pulumi up
Previewing update (dev):

...

Updating (dev):

     Type                                Name                                         Status      Info
 +   pulumi:pulumi:Stack                 lambda-authorizer-dev                        created     1 message
 +   ├─ aws:apigateway:x:API             myapi                                        created
 +   │  ├─ aws:iam:Role                  myapi70a45a97                                created
 +   │  ├─ aws:iam:RolePolicyAttachment  myapi70a45a97-32be53a2                       created
 +   │  ├─ aws:lambda:Function           myapi70a45a97                                created
 +   │  ├─ aws:apigateway:RestApi        myapi                                        created
 +   │  ├─ aws:apigateway:Deployment     myapi                                        created
 +   │  ├─ aws:lambda:Permission         myapi-31a4e902                               created
 +   │  └─ aws:apigateway:Stage          myapi                                        created
 +   ├─ aws:iam:Role                     jwt-rsa-custom-authorizer                    created
 +   ├─ aws:iam:Role                     jwt-rsa-custom-authorizer-authorizer-role    created
 +   ├─ aws:iam:RolePolicyAttachment     jwt-rsa-custom-authorizer-32be53a2           created
 +   ├─ aws:lambda:Function              jwt-rsa-custom-authorizer                    created
 +   └─ aws:iam:RolePolicy               jwt-rsa-custom-authorizer-invocation-policy  created

Outputs:
    url: "https://***.execute-api.us-east-2.amazonaws.com/stage/"

Resources:
    + 14 created

Duration: 18s
```

## Testing Our API

We can now use cURL to test out our new endpoint. If we cURL without a token, we should get a 401 Unauthorized response.

```bash
$ curl $(pulumi stack output url)hello
{"message":"Unauthorized"}
```

We can curl our endpoint with an invalid token and should once again get a 401 Unauthorized response.

```bash
$ curl $(pulumi stack output url)hello -H "Authorization: Bearer invalid"
{"message":"Unauthorized"}
```

Finally, we expect a 200 response when we obtain a token from Auth0 and use it to call our API. We can get a token by visiting the API Details page for our API and clicking the Test tab. Using the provided access token and the API a 200 response: Hello world!

```bash
$ curl $(pulumi stack output url)hello -H "Authorization: Bearer <VALID_TOKEN>"
<h1>Hello world!</h1>
```

## Clean up

1. Run `pulumi destroy` to tear down all resources.

1. To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi console.
