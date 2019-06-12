// Shapes of the slack messages we receive.

export interface SlackRequest {
    type: "url_verification" | "event_callback";
    token: string;
}

export interface UrlVerificationRequest extends SlackRequest {
    type: "url_verification",
    challenge: string;
}

export interface EventCallbackRequest extends SlackRequest {
    type: "event_callback";
    team_id: string;
    api_app_id: string;
    event: Event;
    event_id: string;
    event_time: number;
    authed_users: string[];
}

export interface Event {
    client_msg_id: string;
    type: "message" | "app_mention";
    text: string;
    user: string;
    ts: string;
    channel: string;
    event_ts: string;
    channel_type: string;
}