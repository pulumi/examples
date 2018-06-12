import * as azureFunction from "./azureFunction";

// Create an Azure function that prints a message and the request headers.

function handler(context: azureFunction.Context, request: azureFunction.HttpRequest) {
    let body = "";
    let headers = context.req!.headers!;
    for (let h in headers) {
        body = body + `${h} = ${headers[h]}\n`;
    }

    let res: azureFunction.HttpResponse = {
        status: azureFunction.HttpStatusCode.OK,
        headers: {
            "content-type": "text/plain",
        },
        body: `Greetings from Azure Functions!\n\n===\n\n${body}`,
    };

    context.done(undefined, res);
}

let fn = new azureFunction.HttpFunction("fn", handler);
export let endpoint = fn.endpoint;
