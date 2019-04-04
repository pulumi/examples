import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

import * as https from "https"
import * as qs from "qs";
import * as superagent from "superagent";

const config = new pulumi.Config("mentionbot");
const slackToken = config.require("slackToken");
const verificationToken = config.require("verificationToken");

const subscriptionsTable = new aws.dynamodb.Table("subscriptions", {
    attributes: [{
        name: "id",
        type: "S",
    }],
    hashKey: "id",
    readCapacity: 5,
    writeCapacity: 5,
});

const messageTopic = new aws.sns.Topic("messages");

interface UrlVerificationRequest {
    type: "url_verification";
    token: string;
    challenge: string;
}

// function verifyUrl(request: UrlVerificationRequest): awsx.apigateway.Response {
//     if (request.token !== verificationToken) {
//         console.log("Failed token verification")
//         resp.status(401).write("Incorrect token").end()
//     }
// }

interface Event {
    client_msg_id: string,
    type: "message" | "app_mention",
    text: string,
    user: string,
    ts: string,
    channel: string,
    event_ts: string,
    channel_type: "channel"
}


interface EventCallbackRequest {
    type: "event_callback",
    token: string,
    team_id: string,
    api_app_id: string,
    event: Event,
    event_id: string,
    event_time: number,
    authed_users: string[],
}

// Create an API endpoint
let endpoint = new awsx.apigateway.API("mentionbot", {
    routes: [{
        path: "/events",
        method: "POST",
        eventHandler: async (event) => {
            try {
                console.log(JSON.stringify(event));

                if (event.isBase64Encoded) {
                    const data = Buffer.from(event.body, "base64").toString();
                    console.log("data: " + data);
                    const parsed = JSON.parse(Buffer.from(event.body, "base64").toString());
                    switch (parsed.type) {
                        case "url_verification":
                            return await onUrlVerification(<UrlVerificationRequest>parsed);
                        case "event_callback":
                            return await onEventCallback(<EventCallbackRequest>parsed);
                        default:
                            return {
                                statusCode: 200,
                                body: "Unknown event: " + parsed.type,
                            }
                    }
                }

                return {
                    statusCode: 200,
                    body: JSON.stringify(event),
                }
            }
            catch (err) {
                if (err.verificationFailed) {
                    return {
                        statusCode: 401,
                        body: "Invalid verification token",
                    }
                }

                return {
                    statusCode: 500,
                    body: err.message,
                }
            }
        },
    }],
});

function onUrlVerification(request: UrlVerificationRequest) {
    return {
        statusCode: 200,
        body: JSON.stringify({ challenge: request.challenge }),
    };
}

async function onEventCallback(request: EventCallbackRequest): Promise<awsx.apigateway.Response> {
    validateToken(request.token);

    const event = request.event;
    if (!event) {
        return {
            statusCode: 200,
            body: "No event in message",
        }
    }

    console.log("Posting to topic");
    const client = new aws.sdk.SNS();
    const result = await client.publish({
        Message: JSON.stringify(request),
        TopicArn: messageTopic.arn.get(),
    }).promise();
    console.log("Posted to topic");

    return {
        statusCode: 200,
        body: "Successfully posted to topic.",
    }
}

messageTopic.onEvent("processTopicMessage", async ev => {
    console.log("Processing topic.  Got records: " + ev.Records.length);
    for (const record of ev.Records) {
        console.log("Processing: " + record.Sns.Message);
        const request = <EventCallbackRequest>JSON.parse(record.Sns.Message);

        switch (request.event.type) {
            case "message":
                await onMessageEventCallback(request);
                return;
            case "app_mention":
                await onAppMentionEventCallback(request);
                return;
            default:
                console.log("Unknown event type: " + request.event.type);
        }
    }
});

async function onMessageEventCallback(request: EventCallbackRequest) {
    const event = request.event;
    if (!event.text) {
        console.log("Event had no text");
        return;
    }

    //<@U6R1NJ8Q6>
    const client = new aws.sdk.DynamoDB.DocumentClient();
    // const scanResult = await client.scan({
    //     TableName: subscriptionsTable.name.get(),
    // }).promise();

    // if (!scanResult.Items) {
    //     console.log("No subscribed users.");
    // }
    // else {
    //     for (let i = 0; i < scanResult.Items.length; i++) {
    //         console.log("item: " + JSON.stringify(scanResult.Items[i]));
    //     }
    // }

    const matches = event.text.match(/<@[A-Z0-9]+>/gi);
    if (!matches) {
        console.log("No @mentions in this message.");
        return;
    }

    for (const match of new Set(matches)) {
        await processMatch(match);
    }

    return;

    async function processMatch(match: string) {
        const id = match.substring(2, match.length - 1);
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
        const text = `Hi <@${id}>.  You've been mentioned in ${permaLink}!`

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
    const client = new aws.sdk.DynamoDB.DocumentClient();

    const event = request.event;
    if (event.text.toLowerCase().indexOf("unsubscribe") >= 0) {
        await client.delete({
            TableName: subscriptionsTable.name.get(),
            Key: { id: event.user },
        }).promise();

        const text = `Hi <@${event.user}>.  You've been unsubscribed from @ mentions. Mention me again to resubscribe.`
        await sendChannelMessage(event.channel, text);
    }
    else {
        await client.put({
            TableName: subscriptionsTable.name.get(),
            Item: { id: event.user, channel: event.channel },
        }).promise();

        const text = `Hi <@${event.user}>.  You've been subscribed to @ mentions. Send me an message containing 'unsubscribe' to stop receiving these notifications.`
        await sendChannelMessage(event.channel, text);
    }
}

function validateToken(token: string) {
    if (token !== verificationToken) {
        var err = new Error();
        (<any>err).verificationFailed = true;
        throw err;
    }
}

export const url = endpoint.url;
