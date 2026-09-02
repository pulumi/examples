import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface ObservabilityArgs {
    /** Email address subscribed to the alarm notification topic. */
    notificationEmail: string;
    /** Prefix applied to the names of the resources this component creates. */
    namePrefix: string;
    /** Tags applied to every resource that supports them. */
    tags?: Record<string, string>;
}

/**
 * Observability wires up a baseline set of production monitoring resources for a
 * Lambda-based service: a log group, an SNS topic with an email subscription,
 * error and latency alarms, and a CloudWatch dashboard. A small sample function
 * (with AWS X-Ray tracing enabled) stands in for the workload you want to watch.
 */
export class Observability extends pulumi.ComponentResource {
    public readonly dashboardId: pulumi.Output<string>;
    public readonly notificationTarget: pulumi.Output<string>;
    public readonly traceHook: pulumi.Output<string>;

    constructor(name: string, args: ObservabilityArgs, opts?: pulumi.ComponentResourceOptions) {
        super("examples:productionObservability:Aws", name, {}, opts);
        const parent = { parent: this };
        const tags = args.tags;

        // Where the sample function writes its logs.
        const logGroup = new aws.cloudwatch.LogGroup(`${name}-logs`, {
            name: `/aws/lambda/${args.namePrefix}-api`,
            retentionInDays: 30,
            tags,
        }, parent);

        // Notification channel for the alarms below.
        const topic = new aws.sns.Topic(`${name}-alerts`, {
            name: `${args.namePrefix}-alerts`,
            tags,
        }, parent);

        new aws.sns.TopicSubscription(`${name}-email`, {
            topic: topic.arn,
            protocol: "email",
            endpoint: args.notificationEmail,
        }, parent);

        // Execution role for the sample function, with permission to emit logs
        // and X-Ray trace segments.
        const role = new aws.iam.Role(`${name}-lambda-role`, {
            assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" }),
            tags,
        }, parent);

        new aws.iam.RolePolicyAttachment(`${name}-basic`, {
            role: role.name,
            policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
        }, parent);

        new aws.iam.RolePolicyAttachment(`${name}-xray`, {
            role: role.name,
            policyArn: aws.iam.ManagedPolicy.AWSXRayDaemonWriteAccess,
        }, parent);

        // A minimal sample workload. Replace this with the function you actually
        // want to observe; the alarms and dashboard reference it by name.
        const fn = new aws.lambda.Function(`${name}-sample`, {
            name: `${args.namePrefix}-sample`,
            role: role.arn,
            runtime: aws.lambda.Runtime.NodeJS20dX,
            handler: "index.handler",
            code: new pulumi.asset.AssetArchive({
                "index.js": new pulumi.asset.StringAsset(
                    "exports.handler = async () => ({ statusCode: 200, body: 'ok' });",
                ),
            }),
            tracingConfig: { mode: "Active" },
            environment: { variables: { POWERTOOLS_SERVICE_NAME: args.namePrefix } },
            tags,
        }, { ...parent, dependsOn: [logGroup] });

        const alarmActions = [topic.arn];

        // Fire on any error, and on sustained high latency.
        new aws.cloudwatch.MetricAlarm(`${name}-errors`, {
            name: `${args.namePrefix}-lambda-errors`,
            comparisonOperator: "GreaterThanOrEqualToThreshold",
            evaluationPeriods: 1,
            metricName: "Errors",
            namespace: "AWS/Lambda",
            period: 60,
            statistic: "Sum",
            threshold: 1,
            dimensions: { FunctionName: fn.name },
            alarmActions,
        }, parent);

        new aws.cloudwatch.MetricAlarm(`${name}-latency`, {
            name: `${args.namePrefix}-lambda-latency`,
            comparisonOperator: "GreaterThanThreshold",
            evaluationPeriods: 2,
            metricName: "Duration",
            namespace: "AWS/Lambda",
            period: 60,
            statistic: "Average",
            threshold: 1000,
            dimensions: { FunctionName: fn.name },
            alarmActions,
        }, parent);

        // A single-widget dashboard charting the function's error and duration metrics.
        const dashboard = new aws.cloudwatch.Dashboard(`${name}-dashboard`, {
            dashboardName: `${args.namePrefix}-dashboard`,
            dashboardBody: pulumi.jsonStringify({
                widgets: [{
                    type: "metric",
                    width: 12,
                    height: 6,
                    properties: {
                        metrics: [
                            ["AWS/Lambda", "Errors", "FunctionName", fn.name],
                            [".", "Duration", ".", "."],
                        ],
                        period: 60,
                        stat: "Average",
                        region: aws.config.region,
                        title: "Sample Lambda health",
                    },
                }],
            }),
        }, parent);

        this.dashboardId = dashboard.dashboardName;
        this.notificationTarget = topic.arn;
        this.traceHook = fn.name.apply((v) => `Lambda ${v} has X-Ray tracing active`);

        this.registerOutputs({
            dashboardId: this.dashboardId,
            notificationTarget: this.notificationTarget,
            traceHook: this.traceHook,
        });
    }
}
