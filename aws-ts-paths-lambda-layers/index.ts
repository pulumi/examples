// Load tsconfig-paths-shim to apply the `paths` settings in tsconfig.json.
// See https://github.com/pulumi/pulumi/issues/3061 for details.
import "./tsconfig-paths-shim";

import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as apigateway from "@pulumi/aws-apigateway";
import * as path from "path";

// Reference a local node module.
import { sayHi } from "./layers/utils";

// The config layer contains simple static JSON configuration.
const configLayer = new aws.lambda.LayerVersion("config-layer", {
    layerName: "config",
    code: new pulumi.asset.AssetArchive({
        "config": new pulumi.asset.FileArchive("layers/config"),
    }),
});

// The utils layer packages Node.js modules that can be shared across multiple Lambda functions.
// This layer contains both the sayHi() function called from within the Lambdas below and its dependencies.
// Notice both are placed in a folder named `nodejs/node_modules`; AWS Lambda automatically adds this
// folder to the Node.js module path.
const utilsLayer = new aws.lambda.LayerVersion("utils-layer", {
    layerName: "utils",
    code: new pulumi.asset.AssetArchive({

        // The utils module contains the sayHi() function.
        "nodejs/node_modules/utils": new pulumi.asset.FileArchive("layers/utils/dist"),

        // The node_modules directory contains Day.js, the sayHi() function's lone dependency.
        "nodejs/node_modules": new pulumi.asset.FileArchive("layers/utils/dist"),
    }),
});

const api = new apigateway.RestAPI("api", {
    routes: [
        {
            path: "/hello",
            method: "GET",
            eventHandler: new aws.lambda.CallbackFunction("lambda-1", {
                callback: async () => {

                    // Read directly from the config layer.
                    const message1 = require("/opt/config/config.json").message;

                    // Call a function defined in the utils layer.
                    const message2 = sayHi("endpoint-1");

                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            message1,
                            message2,
                        }),
                    };
                },

                // Attach the config and utils layers to the function.
                layers: [
                    configLayer.arn,
                    utilsLayer.arn,
                ],

                // Exclude the local tsconfig-paths package, as it's not needed by the Lambda.
                codePathOptions: {
                    extraExcludePackages: [
                        "tsconfig-paths"
                    ],
                },
            }),
        },
    ],
});

// Export the API endpoint URL.
export const url = pulumi.interpolate`${api.url}hello`;
