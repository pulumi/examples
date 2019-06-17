import * as azure from "@pulumi/azure";

const resourceGroup = new azure.core.ResourceGroup('example');

// Create an Azure function that prints a message and the request headers.
async function handler(context: azure.appservice.Context<azure.appservice.HttpResponse>, request: azure.appservice.HttpRequest) {
    let body = "";
    const headers = request.headers;
    for (const h in request.headers) {
        body = body + `${h} = ${headers[h]}\n`;
    }

    return {
        status: 200,
        headers: {
            "content-type": "text/plain",
        },
        body: `Greetings from Azure Functions!\n\n===\n\n${body}`,
    };
}

let fn = new azure.appservice.HttpEventSubscription("fn", {
    resourceGroup,
    callback: handler
});

export let endpoint = fn.url;
