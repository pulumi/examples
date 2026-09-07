[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-twitter-athena/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-twitter-athena/README.md#gh-dark-mode-only)

# Twitter search in Athena

A sample project that queries Twitter every 2 minutes and stores the results in S3. The project also sets up an Athena table and query. This project demonstrates using `aws.cloudwatch.EventRule` to run a Lambda on an interval.

Before deploying, register a new [Twitter app](https://apps.twitter.com/) so you have the consumer and access keys used below.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1.  Create a new stack:

    ```bash
    pulumi stack init twitter-athena
    ```

1.  In Twitter, get the keys for your application. Set configuration values for your Twitter consumer key/secret and application key/secret. Use the `--secret` flag to securely encrypt secret values.

    ```bash
    pulumi config set twitterAccessTokenKey <Value for Consumer Key (API Key)>
    pulumi config set --secret twitterAccessTokenSecret <Value for Consumer Secret (API Secret)>
    pulumi config set twitterConsumerKey <Value for Access Token>
    pulumi config set --secret twitterConsumerSecret <Value for Access Token Secret>
    ```

1.  Set a search term to query for:

    ```bash
    pulumi config set twitterQuery "Amazon Web Services"
    ```

1.  Set the AWS region to deploy into:

    ```bash
    pulumi config set aws:region us-west-2
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Preview and deploy the app. A total of 16 resources are created.

    ```bash
    pulumi up
    ```

1.  View the stack outputs:

    ```bash
    pulumi stack output
    ```

    ```
    Please choose a stack: aws-serverless-js-twitter-dev
    Current stack outputs (4):
        OUTPUT                                           VALUE
        athenaDatabase                                   tweets_database
        bucketName                                       tweet-bucket-de18828
        createTableQueryUri                              https://us-west-2.console.aws.amazon.com/athena/home?force#query/saved/e394800e-a35e-44b3-b8ca-8b47b0f74469
        topUsersQueryUri                                 https://us-west-2.console.aws.amazon.com/athena/home?force#query/saved/51fa5744-bab6-4e5f-8cd6-9447b6619f06
    ```

1.  Navigate to the URL for `createTableQueryUri` and run the query in the Athena console. This will create a table called `tweets`.

1.  Navigate to the URL for `topUsersQueryUri` and run the query in Athena. You'll see tweets for your search term, by users with more than 1000 followers.

    ![Athena console](athena-screenshot.png)

## Cleaning up

To clean up resources, destroy your stack and remove it:

```bash
pulumi destroy
pulumi stack rm
```
