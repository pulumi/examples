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
    const asgSize = "1"

    // create (or select if one already exists) a stack that uses our local program
    const stack = await LocalWorkspace.createOrSelectStack(args);

    console.info("successfully initialized stack");
    console.info("setting up config");
    await stack.setConfig("aws:region", { value: "us-east-1" });
    await stack.setConfig("cfg:autoscalingGroupSize", { value: asgSize });
    console.info("config set");
    console.info("refreshing stack...");
    await stack.refresh({ onOutput: console.info });
    console.info("refresh complete");

    if (destroy) {
        // The autoscaling group is sized down to 0 so that there are no instances running. 
        // This allows the cluster to be deleted. Otherwise, the cluster delete will fail due to the existence of instances.
        console.info("resizing autoscaling group size to 0 before destroying the stack ...")
        await stack.setConfig("cfg:autoscalingGroupSize", { value: "0" });
        await stack.up({ onOutput: console.info }); 
        await stack.setConfig("cfg:autoscalingGroupSize", { value: asgSize });

        console.info("destroying stack...");
        await stack.destroy({onOutput: console.info});

        console.info("stack destroy complete");
        process.exit(0);
    }

    console.info("updating stack...");
    const upRes = await stack.up({ onOutput: console.info });
    console.log(`update summary: \n${JSON.stringify(upRes.summary.resourceChanges, null, 4)}`);
    console.log(`website url: ${upRes.outputs.app_url.value}`);
};

run().catch(err => console.log(err));
