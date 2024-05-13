// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

let pulumi = require("@pulumi/pulumi");
let config = new pulumi.Config();
module.exports = {
    slackChannel: config.get("slackChannel") || "#general",
    slackToken: config.require("slackToken"),
};
