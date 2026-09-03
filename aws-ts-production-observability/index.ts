// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.
import * as pulumi from "@pulumi/pulumi";
import { ObservableLambda } from "./components/observability";

const config = new pulumi.Config();

// Email address that receives the alarm notifications. Confirm the SNS
// subscription email AWS sends after the first deploy.
const notificationEmail = config.require("notificationEmail");

const observableLambda = new ObservableLambda("observability", {
    notificationEmail,
    namePrefix: `${pulumi.getStack()}-production-observability`,
    tags: {
        Project: "production-observability",
        Environment: pulumi.getStack(),
    },
});

export const dashboardId = observableLambda.dashboardId;
export const notificationTarget = observableLambda.notificationTarget;
export const traceHook = observableLambda.traceHook;
