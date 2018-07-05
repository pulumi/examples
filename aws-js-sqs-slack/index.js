let pulumi = require("@pulumi/pulumi");
let aws = require("@pulumi/aws");
let serverless = require("@pulumi/aws-serverless");

let config = new pulumi.Config(pulumi.getProject());
let slackChannel = config.get("slackChannel") || "#general";
let slackToken = config.require("slackToken");

let queue = new aws.sqs.Queue("mySlackQueue", { visibilityTimeoutSeconds: 180 });

serverless.queue.subscribe("mySlackPoster", queue, async (e) => {
    let slack = require("@slack/client");
    let client = new slack.WebClient(slackToken);
    for (let rec of e.Records) {
        await client.chat.postMessage({
            channel: slackChannel,
            text: `*SQS message ${rec.messageId}*:\n${rec.body}\n`+
                `(with :love_letter: from Pulumi)`,
            as_user: true,
        });
        console.log(`Posted SQS message ${rec.messageId} to Slack channel ${slackChannel}`);
    }
}, { batchSize: 1 });

module.exports = {
    queueURL: queue.id,
};
