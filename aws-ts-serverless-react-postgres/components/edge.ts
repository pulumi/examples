import * as fs from "fs";
import * as path from "path";

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface EdgeArgs {
    databaseSecretArn: pulumi.Input<string>;
    databaseSecurityGroupId: pulumi.Input<string>;
    vpcId: pulumi.Input<string>;
    privateSubnetIds: pulumi.Input<pulumi.Input<string>[]>;
    websiteDistPath: string;
    apiHandlerPath: string;
    functionMemoryMB: pulumi.Input<number>;
    namePrefix: pulumi.Input<string>;
    tags: Record<string, string>;
}

const MIME_TYPES: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
    ".txt": "text/plain; charset=utf-8",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
};

function contentTypeFor(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] ?? "application/octet-stream";
}

function walk(dir: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...walk(full));
        } else if (entry.isFile()) {
            results.push(full);
        }
    }
    return results;
}

const MANAGED_CACHING_OPTIMIZED_ID = "658327ea-f89d-4fab-a63d-7e88639e58f6";
const MANAGED_CACHING_DISABLED_ID = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad";
const MANAGED_ALL_VIEWER_EXCEPT_HOST_HEADER_ID = "b689b0a8-53d0-40ab-baf2-68738e2966ac";

export class Edge extends pulumi.ComponentResource {
    public readonly siteUrl: pulumi.Output<string>;
    public readonly apiUrl: pulumi.Output<string>;
    public readonly distributionId: pulumi.Output<string>;
    public readonly functionName: pulumi.Output<string>;
    public readonly bucketName: pulumi.Output<string>;

    constructor(name: string, args: EdgeArgs, opts?: pulumi.ComponentResourceOptions) {
        super("serverless-react-postgres:aws:Edge", name, {}, opts);
        const parent = { parent: this };

        const lambdaSecurityGroup = new aws.ec2.SecurityGroup(`${name}-fn-sg`, {
            vpcId: args.vpcId,
            description: "Egress for Lambda to reach Aurora PostgreSQL",
            tags: args.tags,
        }, parent);

        new aws.vpc.SecurityGroupEgressRule(`${name}-fn-egress-db`, {
            securityGroupId: lambdaSecurityGroup.id,
            ipProtocol: "tcp",
            fromPort: 5432,
            toPort: 5432,
            referencedSecurityGroupId: args.databaseSecurityGroupId,
            description: "PostgreSQL to DB",
        }, parent);

        new aws.vpc.SecurityGroupIngressRule(`${name}-db-ingress-fn`, {
            securityGroupId: args.databaseSecurityGroupId,
            ipProtocol: "tcp",
            fromPort: 5432,
            toPort: 5432,
            referencedSecurityGroupId: lambdaSecurityGroup.id,
            description: "PostgreSQL from Lambda",
        }, parent);

        const lambdaRole = new aws.iam.Role(`${name}-fn-role`, {
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Principal: { Service: "lambda.amazonaws.com" },
                    Action: "sts:AssumeRole",
                }],
            }),
            tags: args.tags,
        }, parent);

        new aws.iam.RolePolicyAttachment(`${name}-fn-vpc-access`, {
            role: lambdaRole.name,
            policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
        }, parent);

        new aws.iam.RolePolicy(`${name}-fn-secret`, {
            role: lambdaRole.id,
            policy: pulumi.output(args.databaseSecretArn).apply((arn) => JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Action: ["secretsmanager:GetSecretValue"],
                    Resource: arn,
                }],
            })),
        }, parent);

        const lambdaFunction = new aws.lambda.Function(`${name}-fn`, {
            role: lambdaRole.arn,
            runtime: aws.lambda.Runtime.NodeJS20dX,
            handler: "handler.handler",
            code: new pulumi.asset.FileArchive(args.apiHandlerPath),
            memorySize: args.functionMemoryMB,
            timeout: 30,
            environment: {
                variables: {
                    SECRET_ARN: pulumi.output(args.databaseSecretArn),
                },
            },
            vpcConfig: {
                subnetIds: args.privateSubnetIds,
                securityGroupIds: [lambdaSecurityGroup.id],
            },
            tags: args.tags,
        }, parent);

        const functionUrl = new aws.lambda.FunctionUrl(`${name}-fn-url`, {
            functionName: lambdaFunction.name,
            authorizationType: "NONE",
        }, parent);

        const functionUrlHost = functionUrl.functionUrl.apply((url) => {
            const stripped = url.replace(/^https:\/\//, "");
            return stripped.replace(/\/$/, "");
        });

        const bucket = new aws.s3.BucketV2(`${name}-site`, {
            forceDestroy: true,
            tags: args.tags,
        }, parent);

        new aws.s3.BucketOwnershipControls(`${name}-site-ownership`, {
            bucket: bucket.id,
            rule: { objectOwnership: "BucketOwnerEnforced" },
        }, parent);

        new aws.s3.BucketPublicAccessBlock(`${name}-site-pab`, {
            bucket: bucket.id,
            blockPublicAcls: true,
            blockPublicPolicy: true,
            ignorePublicAcls: true,
            restrictPublicBuckets: true,
        }, parent);

        const websiteFiles = walk(args.websiteDistPath);
        for (const file of websiteFiles) {
            const key = path.relative(args.websiteDistPath, file).split(path.sep).join("/");
            const urlSafeKey = key.replace(/[^A-Za-z0-9._-]/g, "_");
            new aws.s3.BucketObjectv2(`${name}-site-${urlSafeKey}`, {
                bucket: bucket.id,
                key,
                source: new pulumi.asset.FileAsset(file),
                contentType: contentTypeFor(file),
            }, parent);
        }

        const originAccessControl = new aws.cloudfront.OriginAccessControl(`${name}-oac`, {
            originAccessControlOriginType: "s3",
            signingBehavior: "always",
            signingProtocol: "sigv4",
        }, parent);

        const s3OriginId = "s3-site";
        const apiOriginId = "lambda-api";

        const distribution = new aws.cloudfront.Distribution(`${name}-cdn`, {
            enabled: true,
            isIpv6Enabled: true,
            defaultRootObject: "index.html",
            priceClass: "PriceClass_100",
            origins: [
                {
                    originId: s3OriginId,
                    domainName: bucket.bucketRegionalDomainName,
                    originAccessControlId: originAccessControl.id,
                    s3OriginConfig: {
                        originAccessIdentity: "",
                    },
                },
                {
                    originId: apiOriginId,
                    domainName: functionUrlHost,
                    customOriginConfig: {
                        httpPort: 80,
                        httpsPort: 443,
                        originProtocolPolicy: "https-only",
                        originSslProtocols: ["TLSv1.2"],
                    },
                },
            ],
            defaultCacheBehavior: {
                targetOriginId: s3OriginId,
                viewerProtocolPolicy: "redirect-to-https",
                allowedMethods: ["GET", "HEAD"],
                cachedMethods: ["GET", "HEAD"],
                compress: true,
                cachePolicyId: MANAGED_CACHING_OPTIMIZED_ID,
            },
            orderedCacheBehaviors: [
                {
                    pathPattern: "/api/*",
                    targetOriginId: apiOriginId,
                    viewerProtocolPolicy: "redirect-to-https",
                    allowedMethods: ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
                    cachedMethods: ["GET", "HEAD"],
                    compress: true,
                    cachePolicyId: MANAGED_CACHING_DISABLED_ID,
                    originRequestPolicyId: MANAGED_ALL_VIEWER_EXCEPT_HOST_HEADER_ID,
                },
            ],
            customErrorResponses: [
                { errorCode: 403, responseCode: 200, responsePagePath: "/index.html" },
                { errorCode: 404, responseCode: 200, responsePagePath: "/index.html" },
            ],
            restrictions: {
                geoRestriction: { restrictionType: "none" },
            },
            viewerCertificate: {
                cloudfrontDefaultCertificate: true,
            },
            tags: args.tags,
        }, parent);

        const bucketPolicyDocument = aws.iam.getPolicyDocumentOutput({
            statements: [
                {
                    sid: "AllowCloudFrontServicePrincipal",
                    effect: "Allow",
                    principals: [{
                        type: "Service",
                        identifiers: ["cloudfront.amazonaws.com"],
                    }],
                    actions: ["s3:GetObject"],
                    resources: [pulumi.interpolate`${bucket.arn}/*`],
                    conditions: [{
                        test: "StringEquals",
                        variable: "AWS:SourceArn",
                        values: [distribution.arn],
                    }],
                },
            ] as aws.types.input.iam.GetPolicyDocumentStatementArgs[],
        });

        new aws.s3.BucketPolicy(`${name}-site-policy`, {
            bucket: bucket.id,
            policy: bucketPolicyDocument.json,
        }, parent);

        this.siteUrl = distribution.domainName.apply((d) => `https://${d}`);
        this.apiUrl = distribution.domainName.apply((d) => `https://${d}/api`);
        this.distributionId = distribution.id;
        this.functionName = lambdaFunction.name;
        this.bucketName = bucket.bucket;

        this.registerOutputs({
            siteUrl: this.siteUrl,
            apiUrl: this.apiUrl,
            distributionId: this.distributionId,
            functionName: this.functionName,
            bucketName: this.bucketName,
        });
    }
}
