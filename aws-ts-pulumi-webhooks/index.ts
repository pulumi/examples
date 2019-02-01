import * as pulumi from "@pulumi/pulumi";
import * as cloud from "@pulumi/cloud";

import * as crypto from "crypto";

import * as slack from "@slack/client";

import { formatSlackMessage } from "./util";

const config = new pulumi.Config();

const stackConfig = {
    // Webhook secret used to authenticate messages. Must match the value on the
    // webhook's settings.
    sharedSecret: config.get("sharedSecret"),

    slackToken: config.require("slackToken"),
    slackChannel: config.require("slackChannel"),
};

// Just logs information aincomming webhook request.
async function logRequest(req: cloud.Request, _: cloud.Response, next: () => void) {
    const webhookID = req.headers["pulumi-webhook-id"];
    const webhookKind = req.headers["pulumi-webhook-kind"];
    console.log(`Received webhook from Pulumi ${webhookID} [${webhookKind}]`);
    next();
}

// Webhooks can optionally be configured with a shared secret, so that webhook handlers like this app can authenticate
// message integrity. Rejects any incomming requests that don't have a valid "pulumi-webhook-signature" header.
async function authenticateRequest(req: cloud.Request, res: cloud.Response, next: () => void) {
    const webhookSig = req.headers["pulumi-webhook-signature"] as string;  // headers[] returns (string | string[]).
    if (!stackConfig.sharedSecret || !webhookSig) {
        next();
        return;
    }

    const payload = req.body.toString();
    const hmacAlg = crypto.createHmac("sha256", stackConfig.sharedSecret);
    const hmac = hmacAlg.update(payload).digest("hex");

    const result = crypto.timingSafeEqual(Buffer.from(webhookSig), Buffer.from(hmac));
    if (!result) {
        console.log(`Mismatch between expected signature and HMAC: '${webhookSig}' vs. '${hmac}'.`);
        res.status(400).end("Unable to authenticate message: Mismatch between signature and HMAC");
        return;
    }
    next();
}

const webhookHandler = new cloud.HttpEndpoint("pulumi-webhook-handler");

webhookHandler.get("/", async (_, res) => {
    res.status(200).end("🍹 Pulumi Webhook Responder🍹\n");
});

webhookHandler.post("/", logRequest, authenticateRequest, async (req, res) => {
    const webhookKind = req.headers["pulumi-webhook-kind"] as string;  // headers[] returns (string | string[]).
    const payload = <string>req.body.toString();
    const prettyPrintedPayload = JSON.stringify(JSON.parse(payload), null, 2);

    const client = new slack.WebClient(stackConfig.slackToken);

    const fallbackText = `Pulumi Service Webhook (\`${webhookKind}\`)\n` + "```\n" + prettyPrintedPayload + "```\n";
    const messageArgs: slack.ChatPostMessageArguments = {
        channel: stackConfig.slackChannel,
        text: fallbackText,
        as_user: true,
    }

    // Format the Slack message based on the kind of webhook received.
    const formattedMessageArgs = formatSlackMessage(webhookKind, payload, messageArgs);

    await client.chat.postMessage(formattedMessageArgs);
    res.status(200).end(`posted to Slack channel ${stackConfig.slackChannel}\n`);
});

export const url = webhookHandler.publish().url;
