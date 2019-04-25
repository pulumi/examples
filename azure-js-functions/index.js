const { functionApp } = require('@pulumi/azure-serverless')

// Create an Azure function that prints a message and the request headers.

const handler = (context, request) => {
  let body = ''
  const headers = request.headers
  for (let h in headers) {
    body = body + `${h} = ${headers[h]}\n`
  }

  let res = {
    status: 200,
    headers: {
      'content-type': 'text/plain'
    },
    body: `Greetings from Azure Functions!\n\n===\n\n${body}`
  }

  context.done(undefined, res)
}

const fn = new functionApp.HttpFunction('fn', handler)

exports.endpoint = fn.endpoint
