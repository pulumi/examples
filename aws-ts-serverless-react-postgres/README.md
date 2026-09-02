[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-serverless-react-postgres/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-serverless-react-postgres/README.md#gh-dark-mode-only)

# Serverless React + Postgres

A full-stack serverless web app on AWS: a React single-page app served from S3 through CloudFront, a Lambda API behind the *same* CloudFront origin (so the browser never sees CORS), and a private [Aurora Serverless v2](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html) PostgreSQL database that only the function can reach.

The Pulumi program is split into two components:

- `components/database.ts` - an Aurora Serverless v2 PostgreSQL cluster in private subnets, with its connection URL stored in AWS Secrets Manager.
- `components/edge.ts` - the S3 site bucket, the Lambda API (VPC-attached, with least-privilege access to the secret), and a CloudFront distribution that routes `/api/*` to the function and everything else to the SPA.

The app runs on top of the [`aws-ts-landing-zone`](../aws-ts-landing-zone) example: it reads that stack's `networkId`, `privateSubnetIds`, and `secretsStore` outputs through a `StackReference`, so deploy the landing zone first.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure your AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/) 20 or newer
1. A deployed [`aws-ts-landing-zone`](../aws-ts-landing-zone) stack in the same account and region

## Deploying and running the program

1.  Build the React SPA:

    ```bash
    cd website
    npm install
    npm run build
    cd ..
    ```

1.  Build the API bundle:

    ```bash
    cd api
    npm install
    npm run build
    cd ..
    ```

1.  Install the Pulumi program's dependencies:

    ```bash
    npm install
    ```

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the AWS region and point the stack at your landing zone (use the fully-qualified `<org>/<project>/<stack>` name):

    ```bash
    pulumi config set aws:region us-west-2
    pulumi config set landingZoneStack myorg/aws-ts-landing-zone/dev
    ```

1.  Run `pulumi up` to preview and deploy:

    ```bash
    pulumi up
    ```

1.  Open the site. `pulumi up` prints a `siteUrl`; the SPA fetches `/api/random` and displays the number the API read from Postgres.

    ```bash
    curl "$(pulumi stack output apiUrl)/random"
    ```

    ```json
    {"n":42}
    ```

    > Note: A brand-new CloudFront distribution can take several minutes to finish deploying before the URL responds.

## Project layout

- `website/` - Vite + React SPA, built to `website/dist/`.
- `api/` - Node 20 TypeScript handler, bundled to `api/dist/handler.js` with esbuild.
- `index.ts` - reads the landing-zone outputs, then instantiates the `Database` and `Edge` components.

## Clean up

To tear down the resources, run:

```bash
pulumi destroy
pulumi stack rm
```

Idle cost is dominated by the Aurora Serverless v2 minimum capacity, the CloudFront distribution, and S3 storage. Lambda and the Function URL cost nothing when idle.

## Summary

In this example you deployed a same-origin, serverless full-stack app on AWS - React on CloudFront + S3, a VPC-attached Lambda API, and a private Aurora Serverless v2 Postgres database - layered on a shared landing zone via a `StackReference`.
