// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

import { LocalProgramArgs, LocalWorkspace } from "@pulumi/pulumi/x/automation";
import * as upath from "upath";

const process = require("process");

const args = process.argv.slice(2);
let destroy = false;
if (args.length > 0 && args[0]) {
    destroy = args[0] === "destroy";
}

const run = async () => {

    // Create our stack using a local program
    // in the ../fargate directory
    const args: LocalProgramArgs = {
        stackName: "dev",
        workDir: upath.joinSafe(__dirname, "..", "py-ecs-instance"),
    };
    const asgSize = "1";

    // create (or select if one already exists) a stack that uses our local program
    const stack = await LocalWorkspace.createOrSelectStack(args);

    console.log("successfully initialized stack");
    console.log("setting up config");
    await stack.setConfig("aws:region", { value: "us-east-1" });
    await stack.setConfig("cfg:autoscalingGroupSize", { value: asgSize });
    console.log("config set");
    console.log("refreshing stack...");
    await stack.refresh({ onOutput: console.log });
    console.log("refresh complete");

    if (destroy) {
        // The autoscaling group is sized down to 0 so that there are no instances running.
        // This allows the cluster to be deleted. Otherwise, the cluster delete will fail due to the existence of instances.
        console.log("resizing autoscaling group size to 0 before destroying the stack ...");
        await stack.setConfig("cfg:autoscalingGroupSize", { value: "0" });
        await stack.up({ onOutput: console.log });
        await stack.setConfig("cfg:autoscalingGroupSize", { value: asgSize });

        console.log("destroying stack...");
        await stack.destroy({onOutput: console.log});

        console.log("stack destroy complete");
        process.exit(0);
    }

    console.log("updating stack...");
    const upRes = await stack.up({ onOutput: console.log });
    console.log(`update summary: \n${JSON.stringify(upRes.summary.resourceChanges, null, 4)}`);
    console.log(`website url: ${upRes.outputs.app_url.value}`);
};

run().catch(err => console.log(err));
