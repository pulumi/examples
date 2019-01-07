import * as pulumi from "@pulumi/pulumi";
import * as cloud from "@pulumi/cloud";
import * as cloudAws from "@pulumi/cloud-aws";

import * as crypto from "crypto";

import * as slack from "@slack/client";

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
    const webhookID = req.headers["pulumi-webhook-id"] as string;
    const webhookKind = req.headers["pulumi-webhook-kind"] as string;
    console.log(`Received webhook from Pulumi ${webhookID} [${webhookKind}]`);
    next();
}

// Webhooks can optionally be configured with a shared secret, so that webhook handlers like this app can authenticate
// message integrity. Rejects any incomming requests that don't have a valid "pulumi-webhook-signature" header.
async function authenticateRequest(req: cloud.Request, res: cloud.Response, next: () => void) {
    const webhookSig = req.headers["pulumi-webhook-signature"] as string;
    if (!stackConfig.sharedSecret || !webhookSig) {
        next();
        return;
    }

    const payload = <string>req.body.toString();
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

const webhookHandler = new cloudAws.HttpEndpoint("pulumi-webhook-handler");

webhookHandler.get("/", async (_, res) => {
    res.status(200).end("🍹 Pulumi Webhook Responder🍹\n");
});

webhookHandler.post("/", logRequest, authenticateRequest, async (req, res) => {
    const webhookKind = req.headers["pulumi-webhook-kind"] as string;
    const payload = <string>req.body.toString();
    const prettyPrintedPayload = JSON.stringify(JSON.parse(payload), null, 2);

    const client = new slack.WebClient(stackConfig.slackToken);
    await client.chat.postMessage(
        {
            channel: stackConfig.slackChannel,
            text:
                `Pulumi Service Webhook (\`${webhookKind}\`)\n` +
                "```\n" + prettyPrintedPayload + "```\n",
            as_user: true,
        });
    res.status(200).end(`posted to Slack channel ${stackConfig.slackChannel}\n`);
});

export const url = webhookHandler.publish().url;
