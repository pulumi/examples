// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.
import * as pulumi from "@pulumi/pulumi";
import { Observability } from "./components/observability";

const config = new pulumi.Config();

// Email address that receives the alarm notifications. Confirm the SNS
// subscription email AWS sends after the first deploy.
const notificationEmail = config.require("notificationEmail");

const observability = new Observability("observability", {
    notificationEmail,
    namePrefix: `${pulumi.getStack()}-production-observability`,
    tags: {
        Project: "production-observability",
        Environment: pulumi.getStack(),
    },
});

export const dashboardId = observability.dashboardId;
export const notificationTarget = observability.notificationTarget;
export const traceHook = observability.traceHook;
