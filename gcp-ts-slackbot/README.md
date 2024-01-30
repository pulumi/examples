[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-slackbot/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-ts-slackbot/README.md#gh-dark-mode-only)

# Slackbot for Posting Slack Mention Notifications

A simple Slackbot (called '@mentionbot') that sends a message to specific channel to notifiy you any time you're @mentioned anywhere.  Very helpful if you want a time-ordered list of @mentions to go through at a later point.

Slack users can subscribe/unsubscribe from notifications easily.  Simply add `@mentionbot` to a channel you want to be notified in.  Then send any message to `@mentionbot` to subscribe.  To stop getting messages send a message to `@mentionbot` containing the word `unsubscribe`.

The example contains a few useful patterns that show how to build a good Slackbot while taking advantage of a lot of conveniences that Pulumi and the `gcp` package provide.

1. we set up an HttpCallbackFunction to receive push notifications from Slack whenever important events happen.
2. Slack has strict requirements on how quickly the push endpoint must respond with `200` notifications before they consider the message not-received, triggering back-off and resending of those same messages.  Because of this, this example does not process Slack `event` messages as they come in.  Instead, they are immediately added to an [GCP PubSub Topic](https://cloud.google.com/pubsub/) to be processed at a later point in time.  This allows the ApiGateway call to return quickly, satisfying Slack's requirements.
3. Two [GCP Cloud Functions](https://cloud.google.com/functions/) are created naturally and simply using simple JavaScript functions.  One javascript function is used to create the CloudFunction that is called when Slack pushes notifications.  The other is used to specify the CloudFunction that will process the messages added to the Topic.  These JavaScript functions can easily access the other Pulumi resources created, avoiding the need to figure out ways to pass Resource info to the CloudFunctions to ensure they can talk to the right resources.  If these resources were swapped out in the future (for example, using BigTable instead of Firestore, or CloudTasks instead of PubSub), Pulumi would ensure the CloudFunctions were updated properly.
4. Pulumi [Secrets](https://www.pulumi.com/docs/intro/concepts/config/) provides a simple way to pass important credentials (like your Slack tokens) without having to directly embed them in your application code.

First, we'll setup the Pulumi App.  Then, we'll go create and configure a Slack App and Bot to interact with our Pulumi App.

## Deploying and running the Pulumi App

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1.  Create a new stack:

    ```bash
    $ pulumi stack init mentionbot
    ```

1.  Set the GCP region and project:

    ```
    $ pulumi config set gcp:region us-central1
    $ pulumi config set gcp:project <your project>
    ```

1.  Restore NPM modules via `npm install` or `yarn install`.

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing update (mentionbot):
    ...

    Do you want to perform this update? yes
    Updating (mentionbot):

        Type                                        Name                       Status
    +   pulumi:pulumi:Stack                         gcp-ts-slack-mentionbot    created
    +   ├─ gcp:cloudfunctions:CallbackFunction      mentionbot                 created
    +-  │  ├─ gcp:storage:BucketObject              mentionbot                 created
    +   │  └─ gcp:cloudfunctions:Function           mentionbot                 created
    +   └─ gcp:pubsub:Topic                         messages                   created
    +       └─ gcp:cloudfunctions:CallbackFunction  processTopicMessage        created
    +          ├─ gcp:storage:BucketObject          processTopicMessage        created
    +          └─ gcp:cloudfunctions:Function       processTopicMessage        created

    Outputs:
        url: "https://us-central1-***.cloudfunctions.net/mentionbot-***"

    Resources:
        + 8 created

    Duration: 25s

    Permalink: https://app.pulumi.com/***/mentionbot/updates/1
    ```



## Creating a new Slackbot

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

Next, we'll enable 'Event Subscriptions'.  This will tell Slack to push events to your ApiGateway endpoint when changes happen.  Note that we put the Stack-Output `url` shown above (along with the `events` suffix).  This corresponds to the specific ApiGateway Route that was defined in the Pulumi app. Note that Slack will test this endpoint to ensure it is accepting Slack notifications and responding to them in a valid manner.  We'll also setup notifications for the events we care about.  Importantly, our bot will have to hear about when people mention it (for subscribing/unsubscribing), as well as hearing about all messages (so it can look for @-mentions):

<p align=center>
<img src=https://user-images.githubusercontent.com/4564579/55648880-58522480-5796-11e9-95fd-edfc9d12c381.png>
<img src=https://user-images.githubusercontent.com/4564579/55648902-63a55000-5796-11e9-8cf6-8e8f4909d600.png>
</p>

Next, we'll go to 'Permissions'.  Here, we can find the oauth tokens your Pulumi App will need.  Specifically, we'll need the 'Bot User Oauth Token' listed here:

<p align=center>
<img src=https://user-images.githubusercontent.com/4564579/55648951-7fa8f180-5796-11e9-81ba-b45d7ebc4bb7.png>
</p>

Underneath this, we'll set the following Scopes defining the permissions of the bot:

<p align=center>
   <img src=https://user-images.githubusercontent.com/4564579/55647362-55edcb80-5792-11e9-8f60-ae5261fa9c9a.png>
</p>

Now, we're almost done.  The only thing left to do is supply your Pulumi App with the appropriate secrets/tokens.  We'll need the Bot Oauth token (shown above), and the 'Verification Token' (found under 'Basic Information'):

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

## Interacting with the Slack Bot

From Slack you can now create your own private channel:

<p align=center>
<img src=https://user-images.githubusercontent.com/4564579/55647696-2ab7ac00-5793-11e9-8165-5672146036d3.png>
</p>

Invite the bot to the channel:

<p align=center>
<img src=https://user-images.githubusercontent.com/4564579/55647722-40c56c80-5793-11e9-8a97-5ce087d2bfe3.png>
</p>

Then send it a message.  Note, it may take several seconds for the bot to respond due to Slack push notification delays, SNS Topic delays, and Slack incoming message delays.

<p align=center>
<img src=https://user-images.githubusercontent.com/4564579/55648466-3e641200-5795-11e9-9917-e64cdf45b63e.png>
</p>

And you're set!  From now on when someone mentions you, you'll get a little message in your channel like so:

<p align=center>
<img src=https://user-images.githubusercontent.com/4564579/55648631-b0d4f200-5795-11e9-886a-8ce0f932e9f1.png>
</p>

## Clean up

1.  Run `pulumi destroy` to tear down all resources.

1.  To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi console.
