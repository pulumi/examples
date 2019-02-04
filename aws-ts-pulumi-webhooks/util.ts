import { ChatPostMessageArguments } from "@slack/client";

// Return a formatted copy of the Slack message object, based on the kind of Pulumi webhook received.
// See the Pulumi and Slack webhook documentation for details.
// https://pulumi.io/reference/service/webhooks.html
// https://api.slack.com/docs/message-attachments
export function formatSlackMessage(kind: string, payload: object, messageArgs: ChatPostMessageArguments): ChatPostMessageArguments {
    const cloned: ChatPostMessageArguments = Object.assign({}, messageArgs) as ChatPostMessageArguments;

    switch (kind) {
        case "stack":
            return formatStack(payload, cloned);
        case "team":
            return formatTeam(payload, cloned);
        case "stack_preview":
        case "stack_update":
            return formatUpdate(kind, payload, cloned);
    }

    return cloned;
}

function formatStack(payload: any, args: ChatPostMessageArguments): ChatPostMessageArguments {
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
    return args
}

function formatTeam(payload: any, args: ChatPostMessageArguments): ChatPostMessageArguments {
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

function formatUpdate(kind: "stack_preview" | "stack_update", payload: any, args: ChatPostMessageArguments): ChatPostMessageArguments {
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

function resultColor(result: string): string {
    switch (result) {
        case "succeeded":
            return "#36a64f";
        case "failed":
            return "#e01563";
    }
    return "#e9a820";
}

function resultEmoji(result: string): string {
    switch (result) {
        case "succeeded":
            return ":tropical_drink:";
        case "failed":
            return ":rotating_light:";
    }
    return "";
}

function titleCase(s: string): string {
    return [s.charAt(0).toUpperCase(), s.substr(1)].join("");
}
