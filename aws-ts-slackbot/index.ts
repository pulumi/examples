import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

import * as qs from "qs";
import * as superagent from "superagent";

import * as types from "./types";

// A simple slack bot that, when requested, will monitor for @mentions of your name and post them to
// the channel you contacted the bot from.

const config = new pulumi.Config("mentionbot");
const slackToken = config.get("slackToken");
const verificationToken = config.get("verificationToken");

// Make a simple table that keeps track of which users have requested to be notified when their name
// is mentioned, and which channel they'll be notified in.
const subscriptionsTable = new aws.dynamodb.Table("subscriptions", {
    attributes: [{ name: "id", type: "S", }],
    hashKey: "id",
    billingMode: "PAY_PER_REQUEST"
});

// Slack has strict requirements on how fast you must be when responding to their messages. In order
// to ensure we don't respond too slowly, all we do is enqueue messages to this topic, and then
// return immediately.
const topic = new aws.sns.Topic("messages");

// Create an API endpoint that slack will use to push events to us with.
const endpoint = new awsx.apigateway.API("mentionbot", {
    routes: [{
        path: "/events",
        method: "POST",
        eventHandler: async (event) => {
            try {
                if (event.body === null || event.body === undefined) {
                    console.log("Unexpected content received");
                    console.log(JSON.stringify(event));
                }
                else {
                    const parsed = event.isBase64Encoded
                      ? JSON.parse(Buffer.from(event.body, "base64").toString())
                      : JSON.parse(event.body);

                    switch (parsed.type) {
                        case "url_verification":
                            // url_verification is the simple message slack sends to our endpoint to
                            // just make sure we're setup properly.  All we have to do is get the
                            // challenge data they send us and return it untouched.
                            const verificationRequest = <types.UrlVerificationRequest>parsed;
                            const challenge = verificationRequest.challenge;
                            return { statusCode: 200, body: JSON.stringify({ challenge }) };

                        case "event_callback":
                            const eventRequest = <types.EventCallbackRequest>parsed;

                            if (eventRequest.token !== verificationToken) {
                                console.log("Error: Invalid verification token");
                                return { statusCode: 401, body: "Invalid verification token" }
                            }

                            await onEventCallback(eventRequest);
                            break;

                        default:
                            console.log("Unknown event type: " + parsed.type);
                            break;
                    }
                }
            }
            catch (err) {
                console.log("Error: " + err.message);
                // Fall through. Even in the event of an error, we want to return '200' so that slack
                // doesn't just repeat the message, causing the same error.
            }

            // Always return success so that Slack doesn't just immediately resend this message to us.
            return { statusCode: 200, body: "" };
        },
    }],
});





async function onEventCallback(request: types.EventCallbackRequest) {
    const event = request.event;
    if (!event) {
        // No event in request, not processing any further.
        return;
    }

    // Just enqueue the request to our topic and return immediately.  We have a strict time limit from
    // slack and they will resend messages if we don't get back to them ASAP.
    const client = new aws.sdk.SNS();
    await client.publish({
        Message: JSON.stringify(request),
        TopicArn: topic.arn.get(),
    }).promise();
}



const subscription =
    topic.onEvent("processTopicMessage", async ev => {
        for (const record of ev.Records) {
            try {
                const request = <types.EventCallbackRequest>JSON.parse(record.Sns.Message);

                switch (request.event.type) {
                    case "message":
                        return await onMessageEventCallback(request);
                    case "app_mention":
                        return await onAppMentionEventCallback(request);
                    default:
                        console.log("Unknown event type: " + request.event.type);
                }
            }
            catch (err) {
                console.log("Error: " + (err.stack || err.message));
            }
        }
    });

export const url = endpoint.url;




const endpointFunc = endpoint.getFunction("/events");
const topicFunc = subscription.func;

const endpointFuncDuration = awsx.lambda.metrics.duration({
    function: endpointFunc,
});
const topicProcessDuration = awsx.lambda.metrics.duration({
    function: topicFunc,
});


const alarm = endpointFuncDuration.withUnit("Seconds")
                                  .withPeriod(300)
                                  .createAlarm("TooLong", {
    threshold: 5,
    evaluationPeriods: 3,
});


const dashboard = new awsx.cloudwatch.Dashboard("mentionbot", {
    widgets: [
        new awsx.cloudwatch.LineGraphMetricWidget({
            width: 12,
            title: "Receiving duration",
            metrics: [
                endpointFuncDuration.with({ extendedStatistic: 90, label: "Duration p90" }),
                endpointFuncDuration.with({ extendedStatistic: 95, label: "Duration p95" }),
                endpointFuncDuration.with({ extendedStatistic: 99, label: "Duration p99" }),
            ],
            annotations: new awsx.cloudwatch.HorizontalAnnotation(alarm),
        }),
        new awsx.cloudwatch.LineGraphMetricWidget({
            width: 12,
            title: "Processing duration",
            metrics: [
                topicProcessDuration.with({ extendedStatistic: 90, label: "Duration p90" }),
                topicProcessDuration.with({ extendedStatistic: 95, label: "Duration p95" }),
                topicProcessDuration.with({ extendedStatistic: 99, label: "Duration p99" }),
            ],
        }),
    ],
});

export const region = aws.config.region;
export const dashboardUrl = pulumi.interpolate
    `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#dashboards:name=${dashboard.dashboardName}`;







































// Called when we hear about a message posted to slack.
async function onMessageEventCallback(request: types.EventCallbackRequest) {
    const event = request.event;
    if (!event.text) {
        // No text for the message, so nothing to do.
        return;
    }

    // Look to see if there are any @mentions.
    const matches = event.text.match(/<@[A-Z0-9]+>/gi);
    if (!matches || matches.length === 0) {
        // No @mentions in the message, so nothing to do.
        return;
    }

    const client = new aws.sdk.DynamoDB.DocumentClient();

    // There might be multiple @mentions to the same person in the same message.
    // So make into a set to make things unique.
    for (const match of new Set(matches)) {
        // Now, notify each unique user they got a message.
        await processMatch(match);
    }

    return;

    async function processMatch(match: string) {
        const id = match.substring("@<".length, match.length - ">".length);

        const getResult = await client.get({
            TableName: subscriptionsTable.name.get(),
            Key: { id: id },
        }).promise();

        if (!getResult.Item) {
            // No subscription found for this user.
            return;
        }

        const permaLink = await getPermalink(event.channel, event.event_ts);
        const text = `New mention at: ${permaLink}`

        await sendChannelMessage(getResult.Item.channel, text);
    }
}

async function sendChannelMessage(channel: string, text: string) {
    const message = { token: slackToken, channel, text };
    await superagent.get(`https://slack.com/api/chat.postMessage?${qs.stringify(message)}`)
}

async function getPermalink(channel: string, message_ts: string) {
    const message = { token: slackToken, channel, message_ts };
    const result = await superagent.get(`https://slack.com/api/chat.getPermalink?${qs.stringify(message)}`)
    return JSON.parse(result.text).permalink;
}

async function onAppMentionEventCallback(request: types.EventCallbackRequest) {
    // Got an app_mention to @mentionbot.
    const event = request.event;
    var promise = event.text.toLowerCase().indexOf("unsubscribe") >= 0
        ? unsubscribeFromMentions(event)
        : subscribeToMentions(event);

    return await promise;
}

async function unsubscribeFromMentions(event: types.Event) {
    const client = new aws.sdk.DynamoDB.DocumentClient();

    // User is unsubscribing.  Remove them from subscription table.
    await client.delete({
        TableName: subscriptionsTable.name.get(),
        Key: { id: event.user },
    }).promise();

    const text = `Hi <@${event.user}>.  You've been unsubscribed from @ mentions. Mention me again to resubscribe.`;
    await sendChannelMessage(event.channel, text);
}

async function subscribeToMentions(event: types.Event) {
    const client = new aws.sdk.DynamoDB.DocumentClient();

    // User is subscribing.  Add them from subscription table.
    await client.put({
        TableName: subscriptionsTable.name.get(),
        Item: { id: event.user, channel: event.channel },
    }).promise();

    const text = `Hi <@${event.user}>.  You've been subscribed to @ mentions. Send me an message containing 'unsubscribe' to stop receiving these notifications.`;
    await sendChannelMessage(event.channel, text);
}