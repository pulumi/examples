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


// Create role for our lambda
const role = new aws.iam.Role("mylambda-role", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ "Service": ["lambda.amazonaws.com", "apigateway.amazonaws.com"] }),
});

// Create the authorizer lambda whose code lives in the ./authfunction directory
const authorizer = new aws.lambda.Function("jwtRsaCustomAuthorizer", {
    code: new pulumi.asset.FileArchive("./authfunction"),
    role: role.arn,
    handler: "index.handler",
    runtime: aws.lambda.NodeJS8d10Runtime,
});


const authorizers: awsx.apigateway.LambdaAuthorizer[] = [
    awsx.apigateway.getTokenLambdaAuthorizer({
        authorizerName: "jwt-rsa-custom-authorizer",
        header: "Authorization",
        handler: authorizer,
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