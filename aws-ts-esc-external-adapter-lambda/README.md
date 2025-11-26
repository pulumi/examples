[![Deploy this example with Pulumi](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-esc-external-adapter-lambda/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-esc-external-adapter-lambda/README.md#gh-dark-mode-only)

# External secrets adapter for Pulumi ESC on AWS Lambda

A reference implementation showing how to build a secure external secrets adapter for Pulumi ESC.
This example validates JWT authentication and request integrity, making it easy to integrate custom or proprietary secret sources with ESC.

For complete documentation on ESC Connect, see the [external provider documentation](/docs/esc/integrations/dynamic-secrets/external/).

## Deploying the adapter

1. Install dependencies:

   ```bash
   npm install
   ```

1. Create a new Pulumi stack:

   ```bash
   pulumi stack init dev
   ```

1. Configure your AWS region:

   ```bash
   pulumi config set aws:region us-west-2
   ```

1. Deploy:

   ```bash
   pulumi up
   ```

1. Copy the adapter URL from the output:

   ```bash
   export ADAPTER_URL=$(pulumi stack output adapterUrl)
   ```

## Using with Pulumi ESC

Create a Pulumi ESC environment:

```yaml
values:
  demo:
    fn::open::external:
      url: https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/stage/
      request:
        message: "Hello from ESC!"
```

Open the environment:

```bash
esc open <your-org>/external-demo
```

Expected output:

```json
{
  "demo": {
    "response": {
      "message": "External secrets adapter responding successfully!",
      "requestEcho": {
        "message": "Hello from ESC!"
      },
      "timestamp": "2025-11-26T12:00:00.000Z"
    }
  }
}
```

## Building your own adapter

The `ESCRequestValidator` class in `index.ts` handles request integrity validation. To integrate your own secret source:

1. Copy the `ESCRequestValidator` class into your adapter
1. Replace the `TODO` comment in the Lambda handler with your secret fetching logic:

   ```typescript
   const { claims, requestBody } = await validator.validateRequest(event);

   // Use claims to further authorize the request
   if (claims.org !== "YOUR-PULUMI-ORG") {
       return { statusCode: 401 };
   }
   
   // Fetch from your secret source
   const secret = await fetchFromYourSecretStore(requestBody.secretName);

   return {
       statusCode: 200,
       body: JSON.stringify(secret),
   };
   ```

See the [external provider documentation](/docs/esc/integrations/dynamic-secrets/external/) for complete implementation guidance and examples in other languages.

## Monitoring

View Lambda logs:

```bash
pulumi logs --follow
```

Or use the AWS CLI:

```bash
aws logs tail /aws/lambda/$(pulumi stack output functionName) --follow
```

The handler logs JWT claims to CloudWatch for debugging.

## Clean up

```bash
pulumi destroy
pulumi stack rm dev
```

## Additional resources

- [Blog: Introducing ESC Connect](/blog/esc-connect/)
- [External Provider Documentation](/docs/esc/integrations/dynamic-secrets/external/)
- [External Rotator Documentation](/docs/esc/integrations/rotated-secrets/external/)
- [Pulumi ESC Documentation](/docs/esc/)
- [Pulumi Community Slack](https://slack.pulumi.com/)
