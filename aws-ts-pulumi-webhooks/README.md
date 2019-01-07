[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Pulumi Webhook Handler

This example creates a Pulumi `cloud.HttpEndpoint` that will receive webhook events delivered
by the Pulumi Service. It then echos the event to Slack.

## Getting Started

### Creating new Webhooks

Webhooks can be created on the Pulumi Service at the Organization or Stack-level. Webhooks
registered to an organization will fire for every stack housed within that organization, as well as
for Organization-specific like team membership changes.

To create a webhook go to the Organization or Stack's settings page, and then navigate to "webhooks".

> Webhooks are only available for Pulumi Team Tier organizations and stacks.

### Creating up the Webhook Handler

Install prerequisites with:

```bash
npm install
```

Configure the Pulumi program. There are several configuration settings that need to be
set:

- `aws:region` - The AWS region to create the `cloud.HttpEndpoint` resource in, e.g. `us-west-2`.
- `sharedSecret` - (Optional) Webhook deliveries can optionally be signed with a shared secret
    token. The shared secret is given to Pulumi, and will be used to verify the contents of
    the message.
- `slackToken` - Slack API access token to use when posting messages. You can create a Slack
    access token by [going here](https://api.slack.com/custom-integrations/legacy-tokens).
- `slackChannel` - The Slack channel to post webhook events to. For example `#pulumi-events`.

## Troubleshooting

### Message Delivery

If you aren't seeing webhook deliveries in Slack, there are several places to look for more information.

- The Pulumi Service. If you go to the webhook's page within the Pulumi Service, you can navigate to
  recent webhook deliveries. If the Pulumi Service has any trouble contacting your webhook handler,
  you will see the error there.
- The Pulumi Stack's logs. If the webhooks are being delivered, but aren't showing up in Slack for some
  reason, you can view the webhook handler's runtime logs by running the `pulumi logs` command.
