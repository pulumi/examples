// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as twilo from "./twilio";

const config = new pulumi.Config();
const phoneNumberSid = config.require("phoneNumberSid");

const handler = new twilo.IncomingPhoneNumber("twilio-example", {
    phoneNumberSid: phoneNumberSid,
    handler: async p => {
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "text/plain",
            },
            body: `Made with \u2764 and Pulumi.`,
        };
    },
});

// We export the SMS URL, for debugging, you can post messages to it with curl to test out your handler without
// having to send an SMS.  For example:
//
// $ curl -X POST -d "From=+12065555555" -d "Body=Hello!" $(pulumi stack output smsUrl)
//
// There are many additional properties you can provide which will be decoded and presented to your handler,
// see: https://www.twilio.com/docs/sms/twiml#request-parameters
export const smsUrl = handler.smsUrl;
