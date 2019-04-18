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
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

import * as jwksClient from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';
import * as util from 'util';


const authorizers: awsx.apigateway.LambdaAuthorizer[] = [
    awsx.apigateway.getTokenLambdaAuthorizer({
        authorizerName: "jwt-rsa-custom-authorizer",
        header: "Authorization",
        handler: async (event: awsx.apigateway.AuthorizerEvent, context: any): Promise<awsx.apigateway.AuthorizerResponse> => {
            let data: awsx.apigateway.AuthorizerResponse;
            try {
                data = await authenticate(event);
            }
            catch (err) {
                console.log(err);
                context.fail(`Unauthorized: ${err.message}`);
                return nil;
            }
            return data;
        },
        identityValidationExpression: "^Bearer [-0-9a-zA-Z\._]*$",
        authorizerResultTtlInSeconds: 3600,
    })];

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

export const url = api.url;

// Code copied directly from Auth0's Guide
// https://github.com/auth0-samples/jwt-rsa-aws-custom-authorizer

require('dotenv').config({ silent: true });


// extract and return the Bearer Token from the Lambda event parameters
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

const jwtOptions = {
    audience: process.env.AUDIENCE,
    issuer: process.env.TOKEN_ISSUER
};

const authenticate = (event: awsx.apigateway.AuthorizerEvent): awsx.apigateway.AuthorizerResponse => {
    console.log(event);
    const token = getToken(event);

    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new Error('invalid token');
    }

    const client = jwksClient({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10, // Default value
        jwksUri: process.env.JWKS_URI
    });

    const getSigningKey = util.promisify(client.getSigningKey);
    return getSigningKey(decoded.header.kid)
        .then((key) => {
            const signingKey = key.publicKey || key.rsaPublicKey;
            return jwt.verify(token, signingKey, jwtOptions);
        })
        .then(decoded => (
            awsx.apigateway.authorizerResponse(decoded.sub, 'Allow', event.methodArn, { scope: decoded.scope })
        ));
}