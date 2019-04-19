// Copyright 2016-2018, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import * as awsx from "@pulumi/awsx";
import * as pulumi from '@pulumi/pulumi';

import * as jwksClient from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';
import * as util from 'util';

const config = new pulumi.Config();
const jwksUri = config.require("jwksUri");
const audience = config.require("audience");
const issuer = config.require("issuer");

// Create the Lambda Authorizer
const authorizers: awsx.apigateway.LambdaAuthorizer[] = [
    awsx.apigateway.getTokenLambdaAuthorizer({
        authorizerName: "jwt-rsa-custom-authorizer",
        header: "Authorization",
        handler: async (event: awsx.apigateway.AuthorizerEvent): Promise<awsx.apigateway.AuthorizerResponse> => {
            let data: awsx.apigateway.AuthorizerResponse;
            try {
                data = await authenticate(event);
            }
            catch (err) {
                console.log(err);
                throw new Error(`Unauthorized`);
            }
            return data;
        },
        identityValidationExpression: "^Bearer [-0-9a-zA-Z\._]*$",
        authorizerResultTtlInSeconds: 3600,
    })];

// Create our API and reference the custom authorizer
const api = new awsx.apigateway.API("myapi", {
    routes: [{
        path: "/a",
        method: "GET",
        eventHandler: async () => {
            return {
                statusCode: 200,
                body: "<h1>Hello world!</h1>",
            };
        },
        authorizers: authorizers,
    }],
});

// Export the URL for our API
export const url = api.url;

/**
 * Below is all code that gets added to the custom Authorizer Lambda. The code was copied and
 * converted to TypeScript from [Auth0's GitHub
 * Example](https://github.com/auth0-samples/jwt-rsa-aws-custom-authorizer)
 */


// Extract and return the Bearer Token from the Lambda event parameters
const getToken = (event: awsx.apigateway.AuthorizerEvent) => {
    if (!event.type || event.type !== 'TOKEN') {
        throw new Error('Expected "event.type" parameter to have value "TOKEN"');
    }

    const tokenString = event.authorizationToken;
    if (!tokenString) {
        throw new Error('Expected "event.authorizationToken" parameter to be set');
    }

    const match = tokenString.match(/^Bearer (.*)$/);
    if (!match || match.length < 2) {
        throw new Error(`Invalid Authorization token - ${tokenString} does not match "Bearer .*"`);
    }
    return match[1];
}

// Check the Token is valid with Auth0
const authenticate = async (event: awsx.apigateway.AuthorizerEvent): Promise<awsx.apigateway.AuthorizerResponse> => {
    console.log(event);
    const token = getToken(event);

    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === "string" || !decoded.header || !decoded.header.kid) {
        throw new Error('invalid token');
    }

    const client = jwksClient({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10, // Default value
        jwksUri: jwksUri
    });

    const getSigningKey = util.promisify(client.getSigningKey);
    const key = await getSigningKey(decoded.header.kid);
    const signingKey = key.publicKey || key.rsaPublicKey;
    if (!signingKey) {
        throw new Error('couldnt get signing key');
    }

    const jwtOptions = {
        audience: audience,
        issuer: issuer
    };
    const verifiedJWT = await jwt.verify(token, signingKey, jwtOptions);

    if (!verifiedJWT || typeof verifiedJWT === "string" || !isVerifiedJWT(verifiedJWT)) {
        throw new Error('couldnt verify JWT');
    }
    return awsx.apigateway.authorizerResponse(verifiedJWT.sub, 'Allow', event.methodArn);
}

interface VerifiedJWT {
    sub: string,
}

function isVerifiedJWT(toBeDetermined: VerifiedJWT | Object): toBeDetermined is VerifiedJWT {
    return (<VerifiedJWT>toBeDetermined).sub !== undefined;
}