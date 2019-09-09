// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

import * as gfirestore from "@google-cloud/firestore";
import * as gpubsub from "@google-cloud/pubsub";

import * as bodyParser from "body-parser";
import * as express from "express";
import * as qs from "qs";
import * as superagent from "superagent";

// A simple slack bot that, when requested, will monitor for @mentions of your name and post them to
// the channel you contacted the bot from.

const firestoreMentionUsersCollectionName = "mentionUsers";

const config = new pulumi.Config("mentionbot");
const slackToken = config.get("slackToken");
const verificationToken = config.get("verificationToken");

// Slack has strict requirements on how fast you must be when responding to their messages. In order
// to ensure we don't respond too slowly, all we do is enqueue messages to this topic, and then
// return immediately.
const messageTopic = new gcp.pubsub.Topic("messages");

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

type AsyncRequestHandler = (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;

const asyncMiddleware = (fn: AsyncRequestHandler) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };

// Create an API endpoint that slack will use to push events to us with.
const endpoint = new gcp.cloudfunctions.HttpCallbackFunction("mentionbot", {
    callbackFactory: () => {
        const app = express();

        app.use(bodyParser.json());

        app.post("/events", asyncMiddleware(handleIncomingHttpRequest));

        return app;
    },
});

async function handleIncomingHttpRequest(req: express.Request, res: express.Response) {
    try {
        switch (req.body.type) {
            case "url_verification":
                // url_verification is the simple message slack sends to our endpoint to
                // just make sure we're setup properly.  All we have to do is get the
                // challenge data they send us and return it untouched.
                const verificationRequest = <UrlVerificationRequest>req.body;
                const challenge = verificationRequest.challenge;
                res.status(200).json({ challenge });
                return;

            case "event_callback":
                const eventRequest = <EventCallbackRequest>req.body;

                if (!slackToken) {
                    throw new Error("mentionbot:slackToken was not provided");
                }

                if (!verificationToken) {
                    throw new Error("mentionbot:verificationToken was not provided");
                }

                if (eventRequest.token !== verificationToken) {
                    console.log("Error: Invalid verification token");
                    res.status(401).json({ status: "Invalid verification token" });
                }

                await onEventCallback(eventRequest);
                break;

            default:
                console.log("Unknown event type: " + req.body.type);
                break;
        }
    }
    catch (err) {
        console.log("Error: " + err.message);
        // Fall through. Even in the event of an error, we want to return '200' so that slack
        // doesn't just repeat the message, causing the same error.
    }

    // Always return success so that Slack doesn't just immediately resend this message to us.
    res.status(200).end();
}

async function onEventCallback(request: EventCallbackRequest) {
    const event = request.event;
    if (!event) {
        // No event in request, not processing any further.
        return;
    }

    // Just enqueue the request to our topic and return immediately.  We have a strict time limit from
    // slack and they will resend messages if we don't get back to them ASAP.
    const pubSub: gpubsub.PubSub = new gpubsub.PubSub();
    const topic = pubSub.topic(messageTopic.name.get());
    await topic.publish(Buffer.from(JSON.stringify(request)));
}

// Hook up a cloud-function that will then process the topic when possible.
messageTopic.onMessagePublished("processTopicMessage", async (data) => {
    try {
        const request = <EventCallbackRequest>JSON.parse(Buffer.from(data.data, "base64").toString());

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

    const firestore = new gfirestore.Firestore();

    // There might be multiple @mentions to the same person in the same message.
    // So make into a set to make things unique.
    for (const match of new Set(matches)) {
        // Now, notify each unique user they got a message.
        await processMatch(match);
    }

    return;

    async function processMatch(match: string) {
        const id = match.substring("@<".length, match.length - ">".length);

        const doc = await firestore.collection(firestoreMentionUsersCollectionName).doc(id);
        if (!doc) {
            // No subscription found for this user.
            return;
        }

        const snapshot = await doc.get();
        if (!snapshot) {
            return;
        }

        const snapshotData = snapshot.data();
        if (!snapshotData) {
            return;
        }

        const permaLink = await getPermalink(event.channel, event.event_ts);
        const text = `New mention at: ${permaLink}`;

        await sendChannelMessage(snapshotData.channel, text);
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
    const firestore = new gfirestore.Firestore();

    // User is unsubscribing.  Remove them from subscription table.
    const doc = firestore.collection(firestoreMentionUsersCollectionName).doc(event.user);
    if (doc) {
        await doc.delete();
    }

    const text = `Hi <@${event.user}>.  You've been unsubscribed from @ mentions. Mention me again to resubscribe.`;
    await sendChannelMessage(event.channel, text);
}

async function subscribeToMentions(event: Event) {
    const firestore = new gfirestore.Firestore();

    // User is subscribing.  Add them from subscription table.
    await firestore.collection(firestoreMentionUsersCollectionName).doc(event.user).set({
        channel: event.channel,
    });

    const text = `Hi <@${event.user}>.  You've been subscribed to @ mentions. Send me an message containing 'unsubscribe' to stop receiving these notifications.`;
    await sendChannelMessage(event.channel, text);
}

export const url = endpoint.httpsTriggerUrl;
