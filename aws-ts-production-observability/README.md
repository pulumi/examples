[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-production-observability/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-production-observability/README.md#gh-dark-mode-only)

# Production Observability for a Lambda Service

Wiring up monitoring after the fact is tedious and easy to get wrong. This example provisions a baseline observability stack for an AWS Lambda service so a new service is watched from its first deploy.

It creates:

- A CloudWatch **log group** with a 30-day retention policy.
- An **SNS topic** with an email subscription for alarm notifications.
- CloudWatch **metric alarms** for function errors and high latency.
- A **CloudWatch dashboard** charting the function's error count and duration.
- A small **sample Lambda function** with AWS X-Ray active tracing enabled, standing in for the workload you want to observe.

Swap the sample function for your real workload (or point the alarms and dashboard at an existing function name) to reuse this as the monitoring layer for any Lambda service.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure your AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying and running the program

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region and the email address to notify:

    ```bash
    pulumi config set aws:region us-west-2
    pulumi config set notificationEmail you@example.com
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Run `pulumi up` to preview and deploy:

    ```bash
    pulumi up
    ```

1.  AWS sends a confirmation email to the address you configured. Click the link in that email to activate the SNS subscription, otherwise alarm notifications won't be delivered.

1.  Inspect the stack outputs:

    ```bash
    pulumi stack output
    ```

    ```
    Current stack outputs (3):
        OUTPUT              VALUE
        dashboardId         dev-production-observability-dashboard
        notificationTarget  arn:aws:sns:us-west-2:***:dev-production-observability-alerts
        traceHook           Lambda dev-production-observability-sample has X-Ray tracing active
    ```

    Open the dashboard in the [CloudWatch console](https://console.aws.amazon.com/cloudwatch/home#dashboards:) to see the widgets.

## Clean up

To tear down the resources, run:

```bash
pulumi destroy
pulumi stack rm
```

## Summary

In this example you deployed a reusable observability baseline for an AWS Lambda service: centralized logs, email alerting through SNS, error and latency alarms, a dashboard, and X-Ray tracing. Point it at your own function to get production monitoring in place from day one.
