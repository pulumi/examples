[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-pulumi-webhooks/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-pulumi-webhooks/README.md#gh-dark-mode-only)

# Pulumi Webhook Handler

This example creates a Pulumi `cloud.HttpEndpoint` that will receive webhook events delivered
by Pulumi Cloud. It then echos the event to Slack.

## Prerequisites
1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
    - [Create an Organization](https://www.pulumi.com/docs/intro/console/organizations/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)

## Steps

After cloning this repo, run these commands from the working directory:

1. Install prerequisites:

    ```bash
    npm install
    ```

1. Create a new Pulumi stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init
    ```

1. Create a [Slack App](https://api.slack.com/apps):

    - Give your app the [`incoming-webhook`](https://api.slack.com/scopes/incoming-webhook) scope.

    - Add your Slack app to the Slack channel in which you want to post webhook events.

1. Set the region for this program:

    ```bash
    pulumi config set aws:region <your-region>
    ```

1. Set the Slack webhook for your app. You can find yours by going to `Features -> Incoming Webhooks` from your Slack app's API page.

    ```bash
    pulumi config set slackWebhook --secret <webhook-url>
    ```

1. Set the Slack channel for your app. This should be the same channel in which you added your Slack app. For example, `#pulumi-events`.

    ```bash
    pulumi config set slackChannel <your-channel>
    ```

1. (Optional) Set the shared secret for your app. Webhook deliveries can optionally be signed with a shared secret token. The shared secret is given to Pulumi, and will be used to verify the contents of the message. You can find yours by going to `Settings -> Basic Information -> Signing Secret` from your Slack app's API page.

    ```bash
    pulumi config set sharedSecret --secret <your-secret>
    ```

1. Execute the Pulumi program:

    ```bash
    pulumi up
    ```

1. Retrieve our new URL:

    ```bash
    pulumi stack output url
    ```

1. Create a [Pulumi webhook](https://www.pulumi.com/docs/intro/console/extensions/webhooks/). Use the output from the previous step as the `Payload URL`.

1. Ping our webhook by clicking `Ping` under `Deliveries` from your webhook's page. You should see the message `Just a friendly ping from Pulumi` in your Slack channel.

1. From there, feel free to experiment. Simply making edits and running `pulumi up` will update your program.

1. Afterwards, destroy your stack and remove it:

	```bash
	pulumi destroy --yes
	pulumi stack rm --yes
	```

## Troubleshooting

### Message Delivery

If you aren't seeing webhook deliveries in Slack, there are several places to look for more information.

- Pulumi Cloud: If you go to the webhook's page within the Pulumi console, you can navigate to
  recent webhook deliveries. If Pulumi Cloud has any trouble contacting your webhook handler,
  you will see the error there.
- The Pulumi stack's logs: If the webhooks are being delivered, but aren't showing up in Slack for some
  reason, you can view the webhook handler's runtime logs by running the `pulumi logs` command.
