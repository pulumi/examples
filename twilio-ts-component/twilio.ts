// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as serverless from "@pulumi/aws-serverless";
import { APIArgs } from "@pulumi/aws-serverless/api";
import { Callback } from "@pulumi/aws-serverless/function";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config("twilio");
const accountSid = config.require("accountSid");
const authToken = config.require("authToken");

export class IncomingPhoneNumber extends pulumi.ComponentResource {
    public /*out*/ readonly smsUrl: pulumi.Output<string>;

    constructor(name: string, args: IncomingPhoneNumberArgs, opts?: pulumi.ResourceOptions) {
        super("twilio:rest:IncomingPhoneNumber", name, {}, opts);

        const apiArgs: APIArgs = {
            routes: [{
                path: "/sms",
                method: "POST",
                handler: (e, ctx, cb) => {
                    // Twilio passes information to POST requests as application/x-www-form-urlencoded, so we decode
                    // the body of the request to get at it.
                    const qs = require("querystring");
                    const params = qs.parse(e.isBase64Encoded ? Buffer.from(e.body, "base64").toString() : e.body);

                    // Loop over any provided media and add it to our array.
                    const allMedia: MediaInfo[] = [];
                    for (let i = 0; i < params.NumMedia; i++) {
                        allMedia.push({
                            ContentType: <string>params[`MediaContentType${i}`],
                            Url: <string>params[`MediaContentUrl${i}`],
                        });
                    }

                    // Copy the payload of the request into our representation.
                    const payload: SmsPayload = {
                        MessageSid: params.MessageSid,
                        AcountSid: params.AccountSid,
                        MessagingServiceSid: params.MessagingServiceSid,
                        From: params.From,
                        To: params.To,
                        Body: params.Body,
                        Media: allMedia,
                        FromLocation: {
                            City: params.FromCity,
                            State: params.FromState,
                            Zip: params.FromZip,
                            Country: params.FromCountry,
                        },
                        ToLocation: {
                            City: params.ToCity,
                            State: params.ToState,
                            Zip: params.ToZip,
                            Country: params.ToCountry,
                        },
                    };

                    // Delegate to the user provided handler.
                    return args.handler(payload, ctx, cb);
                },
            }],
        };

        const api = new serverless.apigateway.API(`${name}-api`, apiArgs, { parent: this });
        this.smsUrl = pulumi.interpolate `${api.url}sms`;

        // Use the twilio SDK to update the handler for the SMS webhook to what we just created.
        const twilio = require("twilio");
        const client = new twilio(accountSid, authToken);

        this.smsUrl.apply(url => {
            client.incomingPhoneNumbers(args.phoneNumberSid).update({
                smsMethod: "POST",
                smsUrl: `${url}`,
            }).done();
        });

        // Register the smsUrl as an output of the component itself.
        super.registerOutputs({
            smsUrl: this.smsUrl,
        });
    }
}

export interface IncomingPhoneNumberArgs {
    phoneNumberSid: string;
    handler: Callback<SmsPayload, serverless.apigateway.Response>;
}

// See https://www.twilio.com/docs/sms/twiml#request-parameters for more information about
// what each parameter means.
export interface SmsPayload {
    MessageSid: string;
    AcountSid: string;
    MessagingServiceSid: string;
    From: string;
    To: string;
    Body: string;
    Media: MediaInfo[];
    FromLocation: Location;
    ToLocation: Location;
}

// Twilio attempts to look up this information and provide it, but it may not always be present.
export interface Location {
    City?: string;
    State?: string;
    Zip?: string;
    Country?: string;
}

export interface MediaInfo {
    ContentType: string;
    Url: string;
}
