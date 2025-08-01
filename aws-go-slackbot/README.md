[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-slackbot/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-slackbot/README.md#gh-dark-mode-only)

# Create a Slackbot for Posting Mention Notifications

This is an example of a Slackbot (called '@mentionbot') that posts a notification to a specific channel any time you're @mentioned anywhere, whether in various channels or via direct message. This bot is useful for when you need a time-ordered list of @mentions to go through at a later point.

Slack users can subscribe/unsubscribe from notifications easily.  To receive notifications, add `@mentionbot` to a channel you want to be notified in.  Then send any message to `@mentionbot` to subscribe.  To stop getting messages, send a message to `@mentionbot` containing the word `unsubscribe`.

1. We set up an ApiGateway API to receive push notifications from Slack whenever important events happen.
2. The API Gateway forwards these notifications to our Lambda function, which processes the Slack events and manages subscriptions using DynamoDB.
3. The[AWS Lambda](https://aws.amazon.com/lambda/) function is created in our code. This function is called when Slack pushes a notification. The Lambda can access the other Pulumi resources created, such as DynamoDB for subscription management. If these resources are swapped out in the future (for example, using RDS instead of DynamoDB), Pulumi will make sure that the Lambda is updated properly.
4. [Pulumi Secrets](https://www.pulumi.com/docs/intro/concepts/secrets/) provides a safe way to pass important credentials (like your Slack tokens) without having to directly embed them in your application code.

First, we'll set up the Pulumi App.  Then, we'll go create and configure a Slack App and Bot to interact with our Pulumi App.

## Deploy the App

> **Note:** Some values in this example will be different from run to run.  These values are indicated
with `***`.

### Step 1: Create a new stack

```bash
$ pulumi stack init mentionbot
```

### Step 2: Set the AWS region

```
$ pulumi config set aws:region us-east-2
```

### Step 3: Build the handler

```bash
make build
```

### Step 4: Preview and deploy your app

Run `pulumi up` to preview and deploy your AWS resources.

```
$ pulumi up
Previewing update (mentionbot):
```

### Step 5: Create a new Slackbot

To create a new Slackbot, first go to https://api.slack.com/apps and create an account if necessary.  Next, click on 'Create New App' here:

<p align=center>
<img src=https://user-images.githubusercontent.com/4564579/55648728-e7127180-5795-11e9-9ddf-849d789ea05b.png>
</p>

Pick your desired name for the app, and the Workspace the app belongs to.  Here we choose `MentionBot`:

<p align=center>
<img src=https://user-images.githubusercontent.com/4564579/55648747-f7c2e780-5795-11e9-9f95-e715ba76b7c8.png>
</p>

Once created, you will need to 'Add features and functionality' to your app. You'll eventually need all these configured:

<p align=center>
<img src=https://user-images.githubusercontent.com/4564579/55648788-15904c80-5796-11e9-9c6c-27f68c900f13.png>
</p>

First, we'll enable 'Incoming Webhooks'.  This allows your Slack bot to post messages into Slack for you:

<p align=center>
<img src=https://user-images.githubusercontent.com/4564579/55648806-22ad3b80-5796-11e9-8dfd-ba86b7ba9351.png>
</p>

Next, create a bot user like so:

<p align=center>
<img src=https://user-images.githubusercontent.com/4564579/55648827-32c51b00-5796-11e9-9abc-086a3760f6af.png>
</p>

Next, we'll enable 'Event Subscriptions'.  This will tell Slack to push events to your ApiGateway endpoint when changes happen.  Note that we put the Stack-Output `url` shown above (along with the `events` suffix).  This corresponds to the specific ApiGateway Route that was defined in the Pulumi app. Note that Slack will test this endpoint to ensure it is accepting Slack notifications and responding to them in a valid manner.  We'll also setup notifications for the events we care about.  Importantly, our Slackbot will have to hear about when people mention it (for subscribing/unsubscribing), as well as hearing about all messages (so it can look for @-mentions):

<p align=center>
<img src=https://user-images.githubusercontent.com/4564579/55648880-58522480-5796-11e9-95fd-edfc9d12c381.png>
<img src=https://user-images.githubusercontent.com/4564579/55648902-63a55000-5796-11e9-8cf6-8e8f4909d600.png>
</p>

Next, we'll go to 'Permissions'.  Here, we can find the OAuth tokens your Pulumi App will need.  Specifically, we'll need the 'Bot User OAuth Token' listed here:

<p align=center>
<img src=https://user-images.githubusercontent.com/4564579/55648951-7fa8f180-5796-11e9-81ba-b45d7ebc4bb7.png>
</p>

Underneath this, we'll set the following Scopes defining the permissions of the bot:

<p align=center>
   <img src=https://user-images.githubusercontent.com/4564579/55647362-55edcb80-5792-11e9-8f60-ae5261fa9c9a.png>
</p>

Now, we're almost done.  The only thing left to do is supply your Pulumi App with the appropriate secrets/tokens.  We'll need the Bot OAuth token (shown above), and the 'Verification Token' (found under 'Basic Information'):

<p align=center>
   <img src=https://user-images.githubusercontent.com/4564579/55647507-af55fa80-5792-11e9-80bf-b07b894d996f.png>
</p>

Supply these both like so:

```
$ pulumi config set --secret mentionbot:slackToken xoxb-...
$ pulumi config set --secret mentionbot:verificationToken d...
```

Next, install the Slack App into your workspace:

<p align=center>
   <img src=https://user-images.githubusercontent.com/4564579/55647599-eaf0c480-5792-11e9-88c5-83daefb32580.png>
</p>

And we're done!

### Step 6: Interact with the Slackbot

From Slack you can now create your own private channel:

<p align=center>
<img src=https://user-images.githubusercontent.com/4564579/55647696-2ab7ac00-5793-11e9-8165-5672146036d3.png>
</p>

Invite the bot to the channel:

<p align=center>
<img src=https://user-images.githubusercontent.com/4564579/55647722-40c56c80-5793-11e9-8a97-5ce087d2bfe3.png>
</p>

Then send it a message.  Note that it may take several seconds for the bot to respond due to Slack push notification delays.

<p align=center>
<img src=https://user-images.githubusercontent.com/4564579/55648466-3e641200-5795-11e9-9917-e64cdf45b63e.png>
</p>

And you're set!  From now on when someone from your team mentions you, you'll get a little message with a direct mention in your channel like so:

<p align=center>
<img src=https://user-images.githubusercontent.com/4564579/55648631-b0d4f200-5795-11e9-886a-8ce0f932e9f1.png>
</p>

## Clean up

1.  Run `pulumi destroy` to tear down all resources.

1.  To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi console.
