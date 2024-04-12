// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import { IncomingWebhook, IncomingWebhookSendArguments } from "@slack/webhook";

import * as crypto from "crypto";

import { formatSlackMessage } from "./util";

const config = new pulumi.Config();

const stackConfig = {
    // Webhook secret used to authenticate messages. Must match the value on the
    // webhook's settings.
    sharedSecret: config.get("sharedSecret"),

    slackWebhook: config.requireSecret("slackWebhook"),
    slackChannel: config.require("slackChannel"),
};

// Just logs information from an incoming webhook request.
function logRequest(req: awsx.apigateway.Request) {
    const webhookID = req.headers !== undefined ? req.headers["pulumi-webhook-id"] : "";
    const webhookKind = req.headers !== undefined ? req.headers["pulumi-webhook-kind"] : "";
    console.log(`Received webhook from Pulumi ${webhookID} [${webhookKind}]`);
}

// Webhooks can optionally be configured with a shared secret, so that webhook handlers like this app can authenticate
// message integrity. Rejects any incoming requests that don't have a valid "pulumi-webhook-signature" header.
function authenticateRequest(req: awsx.apigateway.Request): awsx.apigateway.Response | undefined {
    const webhookSig = req.headers !== undefined ? req.headers["pulumi-webhook-signature"] : "";
    if (!stackConfig.sharedSecret || !webhookSig) {
        return undefined;
    }

    const payload = Buffer.from(req.body!.toString(), req.isBase64Encoded ? "base64" : "utf8");
    const hmacAlg = crypto.createHmac("sha256", stackConfig.sharedSecret);
    const hmac = hmacAlg.update(payload).digest("hex");

    const result = crypto.timingSafeEqual(Buffer.from(webhookSig), Buffer.from(hmac));
    if (!result) {
        console.log(`Mismatch between expected signature and HMAC: '${webhookSig}' vs. '${hmac}'.`);
        return { statusCode: 400, body: "Unable to authenticate message: Mismatch between signature and HMAC" };
    }

    return undefined;
}

// unsecret the webhook so we can add it to the handler
(<any>stackConfig.slackWebhook).isSecret = false;

const webhookHandler = new awsx.apigateway.API("pulumi-webhook-handler", {
    restApiArgs: {
        binaryMediaTypes: ["application/json"],
    },
    routes: [{
        path: "/",
        method: "GET",
        eventHandler: async () => ({
            statusCode: 200,
            body: "🍹 Pulumi Webhook Responder🍹\n",
        }),
    }, {
        path: "/",
        method: "POST",
        eventHandler: async (req) => {
            logRequest(req);
            const authenticateResult = authenticateRequest(req);
            if (authenticateResult) {
                return authenticateResult;
            }

            const webhookKind = req.headers !== undefined ? req.headers["pulumi-webhook-kind"] : "";
            const bytes = req.body!.toString();
            const payload = Buffer.from(bytes, "base64").toString();
            const parsedPayload = JSON.parse(payload);
            const prettyPrintedPayload = JSON.stringify(parsedPayload, null, 2);

            const webhook = new IncomingWebhook(stackConfig.slackWebhook.get());

            const fallbackText = `Pulumi Cloud Webhook (\`${webhookKind}\`)\n` + "```\n" + prettyPrintedPayload + "```\n";
            const messageArgs: IncomingWebhookSendArguments = {
                channel: stackConfig.slackChannel,
                text: fallbackText,
            };

            // Format the Slack message based on the kind of webhook received.
            const formattedMessageArgs = formatSlackMessage(webhookKind, parsedPayload, messageArgs);

            await webhook.send(formattedMessageArgs);
            return { statusCode: 200, body: `posted to Slack channel ${stackConfig.slackChannel}\n` };
        },
    }],
});

export const url = webhookHandler.url;
