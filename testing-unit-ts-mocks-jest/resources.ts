// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const fetch = require("node-fetch");

// Convert the current time into a speech-friendly string.
function getSpeechText() {
    const now = new Date();
    now.setSeconds(now.getSeconds() + 6);

    const local = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    const localHour = local.getHours();
    const localMinute = local.getMinutes();
    const h = localHour > 12 ? localHour - 12 : localHour;
    const m = localMinute < 10 ? `oh ${localMinute}` : localMinute; // So 2:03 -> "two-oh-three"
    const s = local.getSeconds();

    return `At the tone, the time will be ${h} ${m}. And ${s} seconds.`;
}

export const timeFunction = new aws.lambda.CallbackFunction("time-function", {

    // Update the Lambda callback body to convert the current time into an MP3 file.
    callback: async () => {
        const text = getSpeechText();
        const speechURL = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&textLen=${text.length}&tl=en&client=tw-ob`;
        const beepURL = "https://www.pulumi.com/uploads/beep.mp3";
        const ttsResponse = await fetch(speechURL);
        const beepResponse = await fetch(beepURL);
        const speech = await ttsResponse.arrayBuffer();
        const beep = await beepResponse.arrayBuffer();

        // Tack a beep onto the end of the audio returned from Google Translate, then
        // render the whole thing as a base-64 encoded string.
        const body = Buffer.concat([Buffer.from(speech), Buffer.from(beep)]).toString("base64");

        // Return an appropriately shaped HTTP response.
        return {
            body,
            headers: { "Content-Type": "audio/mpeg" },
            isBase64Encoded: true,
            statusCode: 200,
        };
    },
});

export const timeURL = new aws.lambda.FunctionUrl("time-url", {
    functionName: timeFunction.name,
    authorizationType: "NONE",
    cors: {
        allowOrigins: ["*"],
        allowMethods: ["GET"],
    },
});

// Export the public URL of our shiny new service.
export const audioURL = timeURL.functionUrl;
