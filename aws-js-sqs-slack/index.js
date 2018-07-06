// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

let aws = require("@pulumi/aws");
let serverless = require("@pulumi/aws-serverless");
let config = require("./config");

let queue = new aws.sqs.Queue("mySlackQueue", { visibilityTimeoutSeconds: 180 });

serverless.queue.subscribe("mySlackPoster", queue, async (e) => {
    let slack = require("@slack/client");
    let client = new slack.WebClient(config.slackToken);
    for (let rec of e.Records) {
        await client.chat.postMessage({
            channel: config.slackChannel,
            text: `*SQS message ${rec.messageId}*:\n${rec.body}\n`+
                `(with :love_letter: from Pulumi)`,
            as_user: true,
        });
        console.log(`Posted SQS message ${rec.messageId} to Slack channel ${config.slackChannel}`);
    }
}, { batchSize: 1 });

module.exports = {
    queueURL: queue.id,
};
