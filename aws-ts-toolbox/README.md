# Notebook Example App Built with Pulumi AWS Toolbox

Notebook is an open-source, serverless pastebin alternative that demonstrates how to deploy a modern web app to AWS using Pulumi and the pulumi-aws-toolbox library—all with about 100 lines of infrastructure code.

## Overview

Notebook leverages a fully serverless architecture to keep AWS costs nearly $0. It integrates several AWS services and modern web frameworks to provide a scalable, low-maintenance application:

- **Frontend:** Built with SvelteKit and styled with Tailwind CSS.
- **Backend:** With AWS Lambda for handling user data.
- **Static Assets:** Hosted on Amazon S3.
- **Content Delivery:** Using Amazon CloudFront.

A live demo is available at [https://notebook.datalisk.com](https://notebook.datalisk.com).


## How it works

### Backend
A serverless backend is defined using the SimpleNodeLambda component.

```typescript
const backendLambda = new pat.lambda.SimpleNodeLambda(`${resourcePrefix}-backend`, {
    codeDir: `${__dirname}/../backend`,
    roleInlinePolicies: [{
        name: "S3",
        policy: {
            Version: "2012-10-17",
            Statement: [{
                Effect: "Allow",
                Action: ["s3:PutObject"],
                Resource: [pulumi.interpolate`${contentBucket.arn}/content/*`],
            }],
        },
    }],
    environmentVariables: {
        CONTENT_BUCKET: contentBucket.bucket,
    },
});
```

### Static Website

The CloudFront distribution serves as the entry point for the website. The StaticWebsite component creates a necessary resources for API routes, content delivery, path rewrites, and static frontend assets:

```typescript
const website = new pat.website.StaticWebsite(`${resourcePrefix}-website`, {
    acmCertificateArn_usEast1: config.require("acmCertificateArn_usEast1"),
    hostedZoneId: config.require("hostedZoneId"),
    subDomain: resourcePrefix,
    routes: [{
        // API calls routed to the backend Lambda function
        type: RouteType.Lambda,
        pathPattern: '/api/*',
        functionUrl: backendFunctionUrl,
    }, {
        // Direct download for notebook files stored in S3
        type: RouteType.S3,
        pathPattern: '/content/*',
        s3Folder: { bucket: contentBucket, path: '' },
        originCachePolicyId: aws.cloudfront.getCachePolicyOutput({ name: "Managed-CachingDisabled" })
            .apply(policy => policy.id!!),
    }, {
        // Rewrite requests to serve the Notebook UI (e.g., /n/abc123 → /n/0.html)
        type: RouteType.S3,
        pathPattern: "/n/*",
        s3Folder: frontendArtifact,
        viewerRequestFunctionArn: new pat.website.ViewerRequestFunction(`${resourcePrefix}-notebook-rewrite`)
            .rewritePathElement(1, "0.html")
            .create().arn
    }, {
        // Serve static frontend assets
        type: RouteType.S3,
        pathPattern: "/",
        s3Folder: frontendArtifact,
    }],
});
```


## Deployment

See the full code and documentation at [https://github.com/datalisk/pulumi-aws-toolbox/tree/main/examples/notebook-app](https://github.com/datalisk/pulumi-aws-toolbox/tree/main/examples/notebook-app).
