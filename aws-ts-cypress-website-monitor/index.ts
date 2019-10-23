import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import fetch from "node-fetch"

const config = new pulumi.Config();
const slackWebhookUrl = config.get("slack_webhook_url");

const cluster = awsx.ecs.Cluster.getDefault();
const logGroup =  new aws.cloudwatch.LogGroup("logGroup");

const taskDefinition = new awsx.ecs.FargateTaskDefinition("taskDefinition", {
    cpu: "1024",
    memory: "2048",
    logGroup,
    container: {
        image: awsx.ecs.Image.fromPath("image", "."),
        environment: [
            {
                name: "NO_COLOR",
                value: "1",
            }
        ]
    },
});

aws.cloudwatch.onSchedule("schedule", "rate(5 minutes)", new aws.lambda.CallbackFunction<aws.cloudwatch.EventRuleEvent, void>("scheduleHandler", {
    policies: [
        aws.iam.AWSLambdaFullAccess,
        aws.iam.AmazonEC2ContainerServiceFullAccess,
    ],
    callback: async () => {
        const response = await taskDefinition.run({ cluster });
        const ecs = new aws.sdk.ECS();

        if (response && response.tasks && response.tasks.length > 0 && response.tasks[0].taskArn) {
            const task = response.tasks[0].taskArn;

            await ecs.waitFor("tasksStopped", {
                cluster: cluster.cluster.arn.get(),
                tasks: [ task ],
            }).promise();

            const tasks = await ecs.describeTasks({
                cluster: cluster.cluster.arn.get(),
                tasks: [ task ],
            }).promise();

            const t = tasks.tasks && tasks.tasks[0];

            if (t && t.containers) {
                const container = t.containers[0];
                const exitCode = container.exitCode;

                console.log(`Container process exited ${exitCode}.`);

                if (t.startedAt && taskDefinition.logGroup) {
                    const logs = new aws.sdk.CloudWatchLogs();

                    const events = await logs.filterLogEvents({
                        startTime: t.startedAt.getTime(),
                        logStreamNamePrefix: container.name,
                        logGroupName: logGroup.name.get(),
                    }).promise();

                    if (exitCode !== 0) {
                        var text = "Cypress run failed. See below for details:\n\n";

                        if (slackWebhookUrl && events.events) {
                            text += "```" + events.events.map(e => e.message).join("\n") + "```"

                            await fetch(slackWebhookUrl, {
                                method: "POST",
                                body: JSON.stringify({ text }),
                                headers: {
                                    "Content-Type": "application/json",
                                },
                            });
                        }
                    }
                }
            }
        }
    },
}));
