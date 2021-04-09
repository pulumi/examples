// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

// A simple slack bot that, when requested, will monitor for @mentions of your name and post them to
// the channel you contacted the bot from.

// config
const config = new pulumi.Config("mentionbot");
const slackToken = config.get("slackToken");
const verificationToken = config.get("verificationToken");

// Make a simple table that keeps track of which users have requested to be notified when their name
// is mentioned, and which channel they'll be notified in.
// subscriptions table
// [ ] Draft
// [ ] tested
// [ ] Deployed
const subscriptionsTable

// [ ] Draft
// [ ] tested
const messageTopic = new aws.sns.Topic("messages");

// Shapes of the slack messages we receive.

// Create an API endpoint that slack will use to push events to us with.
// API Gateway
//  - /events endpoint
//  - lambda function
// / 

// onEventCallback
// [ ] Draft
// [ ] tested
// [ ] Deployed
async function onEventCallback(request: EventCallbackRequest) {

// snsMessageTopic.onEvent -> processTopicMessage -> lambda function
// Hook up a lambda that will then process the topic when possible.
// [ ] Draft
// [ ] tested
// [ ] Deployed
messageTopic.onEvent("processTopicMessage", async ev => {

// Called when we hear about a message posted to slack.
// [ ] Draft
// [ ] tested
// [ ] Deployed
async function onMessageEventCallback(request: EventCallbackRequest) {

// [ ] Draft
// [ ] tested
// [ ] Deployed
async function sendChannelMessage(channel: string, text: string) {

// [ ] Draft
// [ ] tested
// [ ] Deployed
async function getPermalink(channel: string, timestamp: string) {

// [ ] Draft
// [ ] tested
// [ ] Deployed
async function onAppMentionEventCallback(request: EventCallbackRequest) {

// [ ] Draft
// [ ] tested
// [ ] Deployed
async function unsubscribeFromMentions(event: Event) {

// [ ] Draft
// [ ] tested
// [ ] Deployed
async function subscribeToMentions(event: Event) {

export const url = endpoint.url;
