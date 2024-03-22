[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-js-sqs-slack/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-js-sqs-slack/README.md#gh-dark-mode-only)

# Post AWS SQS Messages to Slack using Serverless Lambdas

This example wires up a serverless AWS Lambda to an AWS SQS queue and demonstrates posting a
message to Slack.  This program provisions resources using Pulumi's deployment system, but lets
you write serverless code as ordinary JavaScript functions.

## Prerequisites

This program requires the Pulumi CLI.  If you don't have it installed already,
[get it here](https://www.pulumi.com/docs/get-started/install/) or simply run `curl -fsSL https://get.pulumi.com | sh`.

After that, you'll need to [configure your AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/) so that Pulumi can
deploy into your account.  If your AWS CLI is already configured, everything should just work.

Since this example uses Slack, you'll also need
[an access token](https://get.slack.help/hc/en-us/articles/215770388-Create-and-regenerate-API-tokens).

## Running the Program

After installing the CLI and cloning the repo, `cd` into the directory, and run these commands:

1. Install NPM modules using `npm install` (or `yarn install` if you prefer Yarn).

2. Create a new stack:

    ```
    $ pulumi stack init sqs-slack-dev
    ```

3. Configure the required variables:

    ```
    # Set the AWS region to deploy into:
    $ pulumi config set aws:region us-west-2
    # Configure the Slack channel and access token to use:
    $ pulumi config set slackChannel "#general"
    $ pulumi config set slackToken xoxb-123456789012-Xw937qtWSXJss1lFaKeqFAKE --secret
    ```

4. Deploy your program to AWS using the `pulumi up` command:

   ```
   $ pulumi up
   ```

   This command  will show you the changes before it makes them.  As soon as you select `yes`, it will begin
   provisioning resources, uploading your lambda, etc.  After it completes, your program is live!

5. To test this out, push a message into your SQS queue using the AWS CLI:

    ```
    $ aws sqs send-message --queue-url $(pulumi stack output queueURL) --message-body "Pulumi+AWS rocks :boom:"
    ```

    If you've done everything right, you'll see a message posted to your Slack channel!

    ![SQS Slack](./sqs_slack.png)

    Notice we've used the `pulumi stack output` command to read the SQS queue URL that was provisioned.

6. Run the `pulumi logs --follow` command to follow the logs.  After a short while, you should see `console.log`
   output that your message was posted to Slack.

    ```
    $ pulumi logs --follow
    2018-07-05T16:46:03.708-07:00[mySlackPoster-queue-subscripti] 2018-07-05T23:46:03.708Z	68b50931-a005-5e85-b5c4-5a890fee5519	Posted SQS message 3caa4069-f549-44d7-8534-6d61840d3420 to Slack channel #general
    ```

7. If you'd like to make some edits, try changing the `index.js` file, and then just run `pulumi up` again.
   Pulumi will detect the minimal set of edits needed to deploy your code.

8. After you're done playing around, you can destroy your program and stack by simply running two commands:

    ```
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```

## Learning More

To learn more about Pulumi, try checking out the [Get Started](https://www.pulumi.com/docs/get-started/) guide and
[Docs](https://www.pulumi.com/docs/).
