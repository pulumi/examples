import { functionApp } from "@pulumi/azure-serverless";

// Create an Azure function that prints a message and the request headers.

function handler(context: functionApp.Context, request: functionApp.HttpRequest) {
    let body = "";
    let headers = context.req!.headers!;

    for (let h in headers) {
        body = body + `${h} = ${headers[h]}\n`;
    }

    let res: functionApp.HttpResponse = {
        status: 200,
        headers: {
            "content-type": "text/plain",
        },
        body: `Greetings from Azure Functions!\n\n===\n\n${body}`,
    };

    context.done(undefined, res);
}

let fn = new functionApp.HttpFunction("fn", handler);
export let endpoint = fn.endpoint;
