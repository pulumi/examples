import * as aws from "@pulumi/aws";
import * as apigateway from "@pulumi/aws-apigateway";
import * as pulumi from "@pulumi/pulumi";

import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import * as jwksClient from "jwks-rsa";

interface APIGatewayProxyEvent {
    headers: { [key: string]: string | undefined };
    requestContext: {
        domainName: string;
        path: string;
    };
    body: string | null;
}

interface APIGatewayProxyResult {
    statusCode: number;
    headers?: { [key: string]: string };
    body: string;
}

/**
 * Reusable helper for validating ESC external provider requests.
 * Copy-paste this into your own adapters to get secure JWT validation.
 */
class ESCRequestValidator {
    private client: jwksClient.JwksClient;

    constructor(jwksUrl: string = "https://api.pulumi.com/oidc/.well-known/jwks") {
        this.client = jwksClient({
            jwksUri: jwksUrl,
            cache: true,
            cacheMaxAge: 600000, // 10 minutes
        });
    }

    /**
     * Validates an ESC external provider request.
     * Returns the validated JWT claims and request body on success.
     * Throws an error with a user-friendly message on validation failure.
     */
    async validateRequest(event: APIGatewayProxyEvent): Promise<{
        claims: jwt.JwtPayload;
        requestBody: any;
    }> {
        // Extract Authorization header
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new Error("Missing or invalid Authorization header");
        }

        const token = authHeader.substring(7);
        const requestBody = event.body || "{}";

        // Verify JWT signature and claims
        const decoded = await this.verifyJWT(token);

        // Verify audience matches adapter URL
        const requestUrl = `https://${event.headers.Host || event.requestContext.domainName}${event.requestContext.path}`;
        if (decoded.aud !== requestUrl) {
            throw new Error(`Audience mismatch: expected ${requestUrl}, got ${decoded.aud}`);
        }

        // Verify body hash
        const bodyHash = decoded.body_hash as string;
        if (!bodyHash) {
            throw new Error("Missing body_hash claim in JWT");
        }

        if (!this.verifyBodyHash(requestBody, bodyHash)) {
            throw new Error("Body hash verification failed");
        }

        return {
            claims: decoded,
            requestBody: JSON.parse(requestBody),
        };
    }

    private async verifyJWT(token: string): Promise<jwt.JwtPayload> {
        return new Promise((resolve, reject) => {
            jwt.verify(
                token,
                (header, callback) => {
                    this.client.getSigningKey(header.kid, (err, key) => {
                        if (err) {
                            callback(err);
                            return;
                        }
                        callback(null, key?.getPublicKey());
                    });
                },
                {
                    algorithms: ["RS256"],
                    complete: false,
                },
                (err, decoded) => {
                    if (err) reject(err);
                    else resolve(decoded as jwt.JwtPayload);
                }
            );
        });
    }

    private verifyBodyHash(body: string, expectedHash: string): boolean {
        const hash = crypto.createHash("sha256").update(body).digest("base64");
        const actualHash = `sha256-${hash}`;
        return actualHash === expectedHash;
    }
}

const adapterFunction = new aws.lambda.CallbackFunction("escExternalAdapter", {
    callback: async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        try {
            // Initialize the validator (Lambda will cache across invocations)
            const validator = new ESCRequestValidator();

            // Validate the request using the reusable helper
            const { claims, requestBody } = await validator.validateRequest(event);

            // Log JWT claims for debugging. You can use these claims for authorization decisions.
            console.log("JWT validation successful");
            console.log("Organization:", claims.org);
            console.log("Environment:", claims.current_env);
            console.log("Trigger User:", claims.trigger_user);
            console.log("Issued At:", new Date((claims.iat || 0) * 1000).toISOString());

            // TODO: Replace this with your secret fetching logic
            // For example:
            // const secret = await fetchFromYourSecretStore(requestBody.secretName);
            // return { statusCode: 200, body: JSON.stringify(secret) };

            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: "External secrets adapter responding successfully!",
                    requestEcho: requestBody,
                    timestamp: new Date().toISOString(),
                }),
            };
        } catch (error: any) {
            console.error("Error processing request:", error);

            // Return appropriate status code based on error type
            const statusCode = error.message.includes("Authorization") ? 401
                : error.message.includes("hash") || error.message.includes("Audience") ? 400
                : 500;

            return {
                statusCode,
                body: JSON.stringify({
                    error: error.message || "Internal server error",
                }),
            };
        }
    },
    policies: [aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole],
});

const api = new apigateway.RestAPI("escExternalAdapterApi", {
    routes: [{
        path: "/",
        method: "POST",
        eventHandler: adapterFunction,
    }],
    // Don't treat JSON as binary data
    binaryMediaTypes: [],
});

export const adapterUrl = api.url;
export const functionName = adapterFunction.name;
export const functionArn = adapterFunction.arn;
