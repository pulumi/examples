[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/twilio-ts-component/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/twilio-ts-component/README.md#gh-dark-mode-only)

# Twilio SMS Handler

A sample for interacting with Twilio SMS. This sample includes a custom Component Resource that abstracts the tedium of interacting with API Gateway and parsing incoming messages from Twilo. This sample requires you to have a Twilio number which can handle SMS.

## Deploying and running the program

1. Create a new stack:

    ```
    $ pulumi stack init twilio-test
    ```

1. Set the AWS region:

    ```
    $ pulumi config set aws:region us-west-2
    ```

1. Configure Twilio settings

    ```
    $ pulumi config set twilio:accountSid <your account sid from https://www.twilio.com/console>
    $ pulumi config set --secret twilio:authToken <your auth token from https://www.twilio.com/console>
    $ pulumi config set phoneNumberSid <the phone number sid from https://www.twilio.com/console/phone-numbers/>
    ```

1. Restore NPM modules via `npm install`.

1. Preview and run the deployment via `pulumi up`.
    ```
    $ pulumi up
    Previewing update of stack 'url-shortener-dev'
    ...

    Updating stack 'twilio-dev'
    Performing changes:

        Type                                 Name                                        Status      Info
    +   pulumi:pulumi:Stack                  aws-serverless-twilio-component-twilio-dev  created
    +   ├─ twilio:rest:IncomingPhoneNumber   twilio-example                              created
    +   │  └─ aws-serverless:apigateway:API  twilio-example-api                          created
    +   │     ├─ aws:apigateway:RestApi      twilio-example-api                          created
    +   │     ├─ aws:apigateway:Deployment   twilio-example-api                          created
    +   │     ├─ aws:lambda:Permission       twilio-example-api-c9e56dfd                 created
    +   │     └─ aws:apigateway:Stage        twilio-example-api                          created
    +   └─ aws:serverless:Function           twilio-example-apic9e56dfd                  created
    +      ├─ aws:iam:Role                   twilio-example-apic9e56dfd                  created
    +      ├─ aws:iam:RolePolicyAttachment   twilio-example-apic9e56dfd-32be53a2         created
    +      └─ aws:lambda:Function            twilio-example-apic9e56dfd                  created

    ---outputs:---
    smsUrl: "https://k44yktdqf8.execute-api.us-west-2.amazonaws.com/stage/sms"

    info: 11 changes performed:
        + 11 resources created
    Update duration: 27.155440706s
    ```

1. Send an SMS message to the phone number you have registered with Twilio, or make a request by hand with cURL (you may wish to pass additional data with your request, see https://www.twilio.com/docs/sms/twiml#request-parameters for the complete set of data that Twilio sends).

    ```
    $ curl -X POST -d "From=+12065555555" -d "Body=Hello!" $(pulumi stack output smsUrl)
    ```

## Clean up

To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.

## About the code

This example builds and uses a custom `pulumi.CustomResource` to make it easy to spin up a SMS handler on Twilio. It could be extended to support Voice as well, by adding an additional handler to `twilio.IncomingPhoneNumberArgs`.

The custom resource itself is in [`twilio.ts`](./twilio.ts) and handles the work to use `@pulumi/aws-serverless` to create a REST endpoint with `serverless.apigateway.API`. The handler registered with API Gateway does some of the teadious work of decoding the incoming event data and the delegates to the actual handler provided to the custom resource.

In addition, at deployment time, the custom resource uses the Twilio SDK to update the SMS Handler for the provided phone number, instead of forcing you to register it by hand in the Twilio console.

Twilio can handle either responses with `text/plain` or `application/xml` Content-Types (when `application/xml` is used, Twilio treats the response as TwiML). `serverless.apigateway.API` defaults to `application/json`, which will cause Twilio to fail to process the response, so we explicitly set the Content-Type header to `text/plain` in this example.
