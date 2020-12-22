// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import { IncomingWebhookSendArguments } from "@slack/webhook";

// Return a formatted copy of the Slack message object, based on the kind of Pulumi webhook received.
// See the Pulumi and Slack webhook documentation for details.
// https://www.pulumi.com/docs/intro/console/extensions/webhooks/
// https://api.slack.com/docs/message-attachments
export function formatSlackMessage(kind: string | undefined, payload: object, messageArgs: IncomingWebhookSendArguments): IncomingWebhookSendArguments {
    const cloned: IncomingWebhookSendArguments = Object.assign({}, messageArgs) as IncomingWebhookSendArguments;

    switch (kind) {
        case "stack":
            return formatStack(payload, cloned);
        case "team":
            return formatTeam(payload, cloned);
        case "stack_preview":
        case "stack_update":
            return formatUpdate(kind, payload, cloned);
        case "ping":
            return formatPing(payload, cloned);
        default:
            return cloned;
    }
}

function formatStack(payload: any, args: IncomingWebhookSendArguments): IncomingWebhookSendArguments {
    const summary = `${payload.organization.githubLogin}/${payload.projectName}/${payload.stackName} ${payload.action}.`;
    args.text = summary;
    args.attachments = [
        {
            fallback: summary,
            fields: [
                {
                    title: "User",
                    value: `${payload.user.name} (${payload.user.githubLogin})`,
                    short: true,
                },
                {
                    title: "Action",
                    value: payload.action,
                    short: true,
                },
            ],
        },
    ];
    return args;
}

function formatTeam(payload: any, args: IncomingWebhookSendArguments): IncomingWebhookSendArguments {
    const summary = `${payload.organization.githubLogin} team ${payload.action}.`;
    args.text = summary;
    args.attachments = [
        {
            fallback: summary,
            fields: [
                {
                    title: "User",
                    value: `${payload.user.name} (${payload.user.githubLogin})`,
                    short: true,
                },
                {
                    title: "Team",
                    value: payload.team.name,
                    short: true,
                },
                {
                    title: "Stack",
                    value: `${payload.organization.githubLogin}/${payload.stackName}`,
                    short: true,
                },
                {
                    title: "Action",
                    value: payload.action,
                    short: true,
                },
                {
                    title: "Members",
                    value: payload.team.members.map((m: any) => `• ${m.name} (${m.githubLogin})`).join("\n"),
                    short: false,
                },
                {
                    title: "Stacks",
                    value: payload.team.stacks.map((s: any) => `• ${s.stackName} (${s.permission})`).join("\n"),
                    short: false,
                },
            ],
        },
    ];
    return args;
}

function formatUpdate(kind: "stack_preview" | "stack_update", payload: any, args: IncomingWebhookSendArguments): IncomingWebhookSendArguments {
    const summary = `${payload.organization.githubLogin}/${payload.projectName}/${payload.stackName} ${payload.kind} ${payload.result}.`;
    args.text = `${resultEmoji(payload.result)} ${summary}`;
    args.attachments = [
        {
            fallback: `${summary}: ${payload.updateUrl}`,
            color: resultColor(payload.result),
            fields: [
                {
                    title: "User",
                    value: `${payload.user.name} (${payload.user.githubLogin})`,
                    short: true,
                },
                {
                    title: "Stack",
                    value: `${payload.organization.githubLogin}/${payload.stackName}`,
                    short: true,
                },
                {
                    title: "Resource Changes",
                    value: Object.keys(payload.resourceChanges)
                        .map(key => `• ${titleCase(key)}: ${payload.resourceChanges[key]}`)
                        .join("\n"),
                    short: true,
                },
                {
                    title: "Kind",
                    value: titleCase(kind.replace("stack_", "")),
                    short: true,
                },
                {
                    title: "Permalink",
                    value: payload.updateUrl,
                    short: false,
                },
            ],
        },
    ];
    return args;
}

function formatPing(payload: any, args: IncomingWebhookSendArguments) {
    args.text = payload.message;
    return args;
}

function resultColor(result: string): string {
    switch (result) {
        case "succeeded":
            return "#36a64f";
        case "failed":
            return "#e01563";
        default:
            return "#e9a820";
    }
}

function resultEmoji(result: string): string {
    switch (result) {
        case "succeeded":
            return ":tropical_drink:";
        case "failed":
            return ":rotating_light:";
        default:
            return "";
    }
}

function titleCase(s: string): string {
    return [s.charAt(0).toUpperCase(), s.substr(1)].join("");
}
