// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as apig from "@pulumi/aws-apigateway";
import * as pulumi from "@pulumi/pulumi";

import * as qs from "qs";
import * as superagent from "superagent";

import * as dynamoClient from "@aws-sdk/client-dynamodb";
import * as sns from "@aws-sdk/client-sns";
import * as dynamoLib from "@aws-sdk/lib-dynamodb";

// A simple slack bot that, when requested, will monitor for @mentions of your name and post them to
// the channel you contacted the bot from.

const config = new pulumi.Config("mentionbot");
const slackToken = config.get("slackToken");
const verificationToken = config.get("verificationToken");

// Make a simple table that keeps track of which users have requested to be notified when their name
// is mentioned, and which channel they'll be notified in.
const subscriptionsTable = new aws.dynamodb.Table("subscriptions", {
    attributes: [{
        name: "id",
        type: "S",
    }],
    hashKey: "id",
    billingMode: "PAY_PER_REQUEST",
});

// Slack has strict requirements on how fast you must be when responding to their messages. In order
// to ensure we don't respond too slowly, all we do is enqueue messages to this topic, and then
// return immediately.
const messageTopic = new aws.sns.Topic("messages");

// Shapes of the slack messages we receive.

interface SlackRequest {
    type: "url_verification" | "event_callback";
    token: string;
}

interface UrlVerificationRequest extends SlackRequest {
    type: "url_verification";
    challenge: string;
}

interface EventCallbackRequest extends SlackRequest {
    type: "event_callback";
    team_id: string;
    api_app_id: string;
    event: Event;
    event_id: string;
    event_time: number;
    authed_users: string[];
}

interface Event {
    client_msg_id: string;
    type: "message" | "app_mention";
    text: string;
    user: string;
    ts: string;
    channel: string;
    event_ts: string;
    channel_type: string;
}

const handler = new aws.lambda.CallbackFunction("handler", {
    callback: async (ev) => {
        try {
            if (!slackToken) {
                throw new Error("mentionbot:slackToken was not provided");
            }

            if (!verificationToken) {
                throw new Error("mentionbot:verificationToken was not provided");
            }

            const event = <any>ev;
            if (!event.isBase64Encoded || event.body == null) {
                console.log("Unexpected content received");
                console.log(JSON.stringify(event));
            }
            else {
                const parsed = JSON.parse(Buffer.from(event.body, "base64").toString());

                switch (parsed.type) {
                    case "url_verification":
                        // url_verification is the simple message slack sends to our endpoint to
                        // just make sure we're setup properly.  All we have to do is get the
                        // challenge data they send us and return it untouched.
                        const verificationRequest = <UrlVerificationRequest>parsed;
                        const challenge = verificationRequest.challenge;
                        return { statusCode: 200, body: JSON.stringify({ challenge }) };

                    case "event_callback":
                        const eventRequest = <EventCallbackRequest>parsed;

                        if (eventRequest.token !== verificationToken) {
                            console.log("Error: Invalid verification token");
                            return { statusCode: 401, body: "Invalid verification token" };
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
});

// Create an API endpoint that slack will use to push events to us with.
const endpoint = new apig.RestAPI("mentionbot", {
    routes: [{
        path: "/events",
        method: "POST",
        eventHandler: handler,
    }],
});

async function onEventCallback(request: EventCallbackRequest) {
    const event = request.event;
    if (!event) {
        // No event in request, not processing any further.
        return;
    }

    // Just enqueue the request to our topic and return immediately.  We have a strict time limit from
    // slack and they will resend messages if we don't get back to them ASAP.
    const client = new sns.SNS();
    await client.publish({
        Message: JSON.stringify(request),
        TopicArn: messageTopic.arn.get(),
    });
}

// Hook up a lambda that will then process the topic when possible.
messageTopic.onEvent("processTopicMessage", async ev => {
    for (const record of ev.Records) {
        try {
            const request = <EventCallbackRequest>JSON.parse(record.Sns.Message);

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

// Called when we hear about a message posted to slack.
async function onMessageEventCallback(request: EventCallbackRequest) {
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

    // There might be multiple @mentions to the same person in the same message.
    // So make into a set to make things unique.
    for (const match of new Set(matches)) {
        // Now, notify each unique user they got a message.
        await processMatch(match);
    }

    return;

    async function processMatch(match: string) {
        const id = match.substring("@<".length, match.length - ">".length);

        const dynoClient = new dynamoClient.DynamoDBClient({});
        const getResult = await dynamoLib.DynamoDBDocument.from(dynoClient).get({
            TableName: subscriptionsTable.name.get(),
            Key: { id: id },
        });

        if (!getResult.Item) {
            // No subscription found for this user.
            return;
        }

        const permaLink = await getPermalink(event.channel, event.event_ts);
        const text = `New mention at: ${permaLink}`;

        await sendChannelMessage(getResult.Item.channel, text);
    }
}

async function sendChannelMessage(channel: string, text: string) {
    const message = { token: slackToken, channel, text };
    await superagent.get(`https://slack.com/api/chat.postMessage?${qs.stringify(message)}`);
}

async function getPermalink(channel: string, timestamp: string) {
    const message = { token: slackToken, channel, message_ts: timestamp };
    const result = await superagent.get(`https://slack.com/api/chat.getPermalink?${qs.stringify(message)}`);
    return JSON.parse(result.text).permalink;
}

async function onAppMentionEventCallback(request: EventCallbackRequest) {
    // Got an app_mention to @mentionbot.
    const event = request.event;
    const promise = event.text.toLowerCase().indexOf("unsubscribe") >= 0
        ? unsubscribeFromMentions(event)
        : subscribeToMentions(event);

    return await promise;
}

async function unsubscribeFromMentions(event: Event) {
    // User is unsubscribing.  Remove them from subscription table.
    const dynoClient = new dynamoClient.DynamoDBClient({});
    await dynamoLib.DynamoDBDocument.from(dynoClient).delete({
        TableName: subscriptionsTable.name.get(),
        Key: { id: event.user },
    });

    const text = `Hi <@${event.user}>.  You've been unsubscribed from @ mentions. Mention me again to resubscribe.`;
    await sendChannelMessage(event.channel, text);
}

async function subscribeToMentions(event: Event) {
    // User is subscribing.  Add them from subscription table.
    const dynoClient = new dynamoClient.DynamoDBClient({});
    await dynamoLib.DynamoDBDocument.from(dynoClient).put({
        TableName: subscriptionsTable.name.get(),
        Item: { id: event.user, channel: event.channel },
    });

    const text = `Hi <@${event.user}>.  You've been subscribed to @ mentions. Send me an message containing 'unsubscribe' to stop receiving these notifications.`;
    await sendChannelMessage(event.channel, text);
}

export const url = endpoint.url;
