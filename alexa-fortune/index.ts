import * as pulumi from "pulumi";
import * as aws from "@pulumi/aws";

// First, create a config object and read the Alexa app ID from the user-provided "alexa-fortune:config:app-id"
// config value.
const config = new pulumi.Config("alexa-fortune:config");
const alexaAppId = config.require("app-id");

// Next, create an asset to hold the file that contains the fortunes our skill will return. The path to this file
// is provided by the user via the "alexa-fortune:config:fortunes" config value.
const fortunesFile = new pulumi.asset.FileAsset(config.require("fortunes"));

// Next, create the lambda function we'll use to serve fortunes. We'll do this by first writing our handler, then
// creating the function resource itself.
async function getFortune(): Promise<string> {
	const fortunes = (await import("fs")).readFileSync(await fortunesFile.path, "utf8").split("\n%\n");
	const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
	return fortune.replace(/\s+/g, " ");
}
async function handler(event: any, context: aws.serverless.Context, callback: (error: any, result: any) => void): Promise<any> {
	const alexa = (await import("alexa-sdk")).handler(event, <any>(context), callback);
	alexa.appId = alexaAppId;
	alexa.registerHandlers({
		"LaunchRequest": function() {
			this.emit("GetFortune");
		},
		"GetFortune": async function() {
			this.emit(":tell", await getFortune());
		},
	});
	alexa.execute();
};
const func = new aws.serverless.Function("lambda", {policies: []}, handler);

// Next, grant Alexa permission to invoke the lambda function we just created.
const alexaPermission = new aws.lambda.Permission("alexa-permission", {
	action: "lambda:InvokeFunction",
	function: func.lambda,
	principal: "alexa-appkit.amazon.com",
});

// Finally, export the ARN of the lambda so that we can hook it up to our Alexa skill.
export const lambdaArn = func.lambda.arn.then(arn => arn);
