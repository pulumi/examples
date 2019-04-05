[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# A simple Slackbot running in AWS using Pulumi.

A simple Slackbot (called '@mentionbot') that sends a message to specific channel to notifiy you any time you're @mentioned anywhere.  Very helpful if you want a time-ordered list of @mentions to go through at a later point.

Slack users can subscribe/unsubscribe from notifications easily.  Simply add `@mentionbot` to a channel you want to be notified in.  Then send any message to `@mentionbot` to subscribe.  To stop getting messages send a message to `@mentionbot` containing the word `unsubscribe`.

The example contains a few useful patterns that show how to build a good Slackbot while taking advantage of a lot of conveniences that Pulumi and the `aws` and `awsx` packages provide.

1. we set up an ApiGateway API to receive push notifications from Slack whenever important events happen.
2. Slack has strict requirements on how quickly the push endpoint must respond with `200` notifications before they consider the message not-received, triggering back-off and resending of those same messages.  Because of this, this example does not process Slack `event` messages as they come in.  Instead, they are immediately added to an [AWS SNS Topic](https://aws.amazon.com/sns/) to be processed at a later point in time.  This allows the ApiGateway call to return quickly, satisfying Slack's requirements.
3. Two [AWS Lambdas](https://aws.amazon.com/lambda/) are created naturally and simply using simple JavaScript functions.  One function is used to create the Lambda that is called when Slack pushes notifications.  The other is used to specify the Lamdba that will process the messages added to the Topic.  These JavaScript functions can easily access the other Pulumi resources created, avoiding the need to figure out ways to pass Resource ARNs/IDs/etc. to the Lambdas to ensure they can talk to the right resources.  If these resources were swapped out in the future (for example, using RDS instead of DynamoDB, or SQS instead of SNS), Pulumi would ensure the Lambdas were updated properly.
4. Pulumi [Secrets](https://pulumi.io/reference/config.html) provides a simple way to pass important credentials (like your Slack tokens) without having to directly embed them in your application code.

First, we'll setup the Pulumi App.  Then, we'll go create and configure a Slack App and Bot to interact with our Pulumi App.

## Deploying and running the Pulumi App

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1.  Create a new stack:

    ```bash
    $ pulumi stack init mentionbot
    ```

1.  Set the AWS region:

    ```
    $ pulumi config set aws:region us-east-2
    ```

1.  Restore NPM modules via `npm install` or `yarn install`.

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing update (mentionbot):
    ...

    Do you want to perform this update? yes
    Updating (mentionbot):

         Type                                Name                          Status 
     +   pulumi:pulumi:Stack                 aws-ts-slack-mentionbot       created
     +   ├─ aws:sns:TopicEventSubscription   processTopicMessage           created
     +   │  ├─ aws:iam:Role                  processTopicMessage           created
     +   │  ├─ aws:iam:RolePolicyAttachment  processTopicMessage-32be53a2  created
     +   │  ├─ aws:lambda:Function           processTopicMessage           created
     +   │  ├─ aws:sns:TopicSubscription     processTopicMessage           created
     +   │  └─ aws:lambda:Permission         processTopicMessage           created
     +   ├─ aws:apigateway:x:API             mentionbot                    created
     +   │  ├─ aws:iam:Role                  mentionbot8e3f228c            created
     +   │  ├─ aws:iam:RolePolicyAttachment  mentionbot8e3f228c-32be53a2   created
     +   │  ├─ aws:lambda:Function           mentionbot8e3f228c            created
     +   │  ├─ aws:apigateway:RestApi        mentionbot                    created
     +   │  ├─ aws:apigateway:Deployment     mentionbot                    created
     +   │  ├─ aws:lambda:Permission         mentionbot-89b3ba11           created
     +   │  └─ aws:apigateway:Stage          mentionbot                    created
     +   ├─ aws:dynamodb:Table               subscriptions                 created
     +   └─ aws:sns:Topic                    messages                      created

    Outputs:
        url: "https://***.execute-api.us-east-2.amazonaws.com/stage/"

    Resources:
        + 17 created

    Duration: 25s

    Permalink: https://app.pulumi.com/***/mentionbot/updates/1
    ```



## Creating a new Slackbot

To create a new Slackbot, first go to https://api.slack.com/apps and create an account if necessary.  Next, click on 'Create New App' here:

![image](https://user-images.githubusercontent.com/4564579/55644887-03111580-578c-11e9-9db8-17dcb258af72.png&s=200)

Pick your desired name for the app, and the Workspace the app belongs to.  Here we choose `MentionBot`.  

![image](https://user-images.githubusercontent.com/4564579/55644961-30f65a00-578c-11e9-8307-038da1462a90.png)

Once created, you will need to 'Add features and functionality' to your app, and then 'Install app to your workspace':

![image](https://user-images.githubusercontent.com/4564579/55645045-5d11db00-578c-11e9-9209-b08dad4a1898.png)

For 'Add features and functionality' you'll eventually need all these configured:

![image](https://user-images.githubusercontent.com/4564579/55645110-87fc2f00-578c-11e9-9f99-e0704a44d39f.png)



## Clean up

1.  Run `pulumi destroy` to tear down all resources.

1.  To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi Console.
