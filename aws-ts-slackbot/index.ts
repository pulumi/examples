import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

import * as qs from "qs";
import * as superagent from "superagent";

// A simple slack bot that, when requested, will monitor for @mentions of your name and post them to
// the channel you contacted the bot from.

const config = new pulumi.Config("mentionbot");
const slackToken = config.require("slackToken");
const verificationToken = config.require("verificationToken");

// Make a simple table that keeps track of which users have requested to be notified when their name
// is mentioned.
const subscriptionsTable = new aws.dynamodb.Table("subscriptions", {
    attributes: [{
        name: "id",
        type: "S",
    }],
    hashKey: "id",
    readCapacity: 5,
    writeCapacity: 5,
});

// Slack has strict requirements on how fast you must be when responding to their messages. In order
// to ensure we don't respond too slowly, all we do is enqueue messages to this topic, and then
// return immediately.
const messageTopic = new aws.sns.Topic("messages");

interface SlackRequest {
    type: "url_verification" | "event_callback";
    token: string;
}

interface UrlVerificationRequest extends SlackRequest {
    type: "url_verification",
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

// Create an API endpoint that slack will use to push events to us with.
const endpoint = new awsx.apigateway.API("mentionbot", {
    routes: [{
        path: "/events",
        method: "POST",
        eventHandler: async (event) => {
            try {
                if (!event.isBase64Encoded) {
                    console.log("Received data that wasn't encoded as expected");
                    console.log(JSON.stringify(event));
                    return { statusCode: 200, body: "unexpected content received" };
                }

                const data = Buffer.from(event.body, "base64").toString();
                console.log("data: " + data);
                const parsed = JSON.parse(Buffer.from(event.body, "base64").toString());

                switch (parsed.type) {
                    case "url_verification":
                        return onUrlVerification(<UrlVerificationRequest>parsed);

                    case "event_callback":
                        await onEventCallback(<EventCallbackRequest>parsed);
                        break;

                    default:
                        const message = "Unknown event type: " + parsed.type;
                        console.log(message);
                        break;
                }

                return { statusCode: 200, body: "success" }
            }
            catch (err) {
                if (err.verificationFailed) {
                    return { statusCode: 401, body: "Invalid verification token" }
                }

                return { statusCode: 500, body: err.message }
            }
        },
    }],
});

function onUrlVerification(request: UrlVerificationRequest) {
    // url_verification is the simple message slack sends to our endpoint to just make sure we're
    // setup properly.  All we have to do is get the challenge data they send us and return it
    // untouched.
    return {
        statusCode: 200,
        body: JSON.stringify({ challenge: request.challenge }),
    };
}

async function onEventCallback(request: EventCallbackRequest) {
    if (request.token !== verificationToken) {
        var err = new Error();
        (<any>err).verificationFailed = true;
        throw err;
    }

    const event = request.event;
    if (!event) {
        console.log("No event in request.");
        console.log(JSON.stringify(request));
        return;
    }

    // Just enqueue the request to our topic and return immediately.  We have a strict time limit from
    // slack and they will resend messages if we don't get back to them aspa.
    console.log("Posting to topic");
    const client = new aws.sdk.SNS();
    await client.publish({
        Message: JSON.stringify(request),
        TopicArn: messageTopic.arn.get(),
    }).promise();
    console.log("Successfully posted to topic");
}

// Hook up a lambda that will then process the topic when possible.
messageTopic.onEvent("processTopicMessage", async ev => {
    console.log(`Processing topic.  Got ${ev.Records.length} record(s)`);
    for (const record of ev.Records) {
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
});

// Called when we hear about a message posted to slack.
async function onMessageEventCallback(request: EventCallbackRequest) {
    const event = request.event;
    if (!event.text) {
        console.log("Event had no text");
        return;
    }

    // Look to see if there are any @mentions.
    const matches = event.text.match(/<@[A-Z0-9]+>/gi);
    if (!matches || matches.length === 0) {
        console.log("No @mentions in this message.");
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
        console.log("Looking up subscription for: " + id);

        const getResult = await client.get({
            TableName: subscriptionsTable.name.get(),
            Key: { id: id },
        }).promise();

        if (!getResult.Item) {
            console.log("Couldn't find subscription for this user.")
            return;
        }

        const permaLink = await getPermalink(event.channel, event.event_ts);
        const text = `New mention at: ${permaLink}`

        await sendChannelMessage(getResult.Item.channel, text);
    }
}

async function sendChannelMessage(channel: string, text: string) {
    const message = {
        token: slackToken,
        channel,
        text,
    };

    const url = `https://slack.com/api/chat.postMessage?${qs.stringify(message)}`;
    console.log("posting url: " + url);

    const res = await superagent.get(url)
    console.log("res: " + res.text);
}

async function getPermalink(channel: string, message_ts: string) {
    const message = {
        token: slackToken,
        channel,
        message_ts,
    };

    const url = `https://slack.com/api/chat.getPermalink?${qs.stringify(message)}`;
    console.log("posting url: " + url);

    const res = await superagent.get(url)
    console.log("res: " + res.text);

    const js = JSON.parse(res.text);
    return js.permalink;
}

async function onAppMentionEventCallback(request: EventCallbackRequest) {
    const event = request.event;
    await event.text.toLowerCase().indexOf("unsubscribe") >= 0
        ? unsubscribeFromMentions(event)
        : subscribeToMentions(event);
}

async function unsubscribeFromMentions(event: Event) {
    const client = new aws.sdk.DynamoDB.DocumentClient();

    // User is unsubscribing.  Remove them from subscription table.
    await client.delete({
        TableName: subscriptionsTable.name.get(),
        Key: { id: event.user },
    }).promise();

    const text = `Hi <@${event.user}>.  You've been unsubscribed from @ mentions. Mention me again to resubscribe.`;
    await sendChannelMessage(event.channel, text);
}

async function subscribeToMentions(event: Event) {
    const client = new aws.sdk.DynamoDB.DocumentClient();

    // User is subscribing.  Add them from subscription table.
    await client.put({
        TableName: subscriptionsTable.name.get(),
        Item: { id: event.user, channel: event.channel },
    }).promise();

    const text = `Hi <@${event.user}>.  You've been subscribed to @ mentions. Send me an message containing 'unsubscribe' to stop receiving these notifications.`;
    await sendChannelMessage(event.channel, text);
}

export const url = endpoint.url;
