const pulumi = require("@pulumi/pulumi")
const aws = require("@pulumi/aws")
const serverless = require("@pulumi/aws-serverless");

// A table to hold the counts of each route that is hit. We use the route name
// as the key for the the table.  The read and write capacity are intentionally
// small for this toy example.  The AWS Free Teir provides 25 units of read and
// write capacity across all DynamoDB Tables in your account.
const table = new aws.dynamodb.Table("counterTable", {
    attributes: [{
        name: "route",
        type: "S",
    }],
    hashKey: "route",
    readCapacity: 1,
    writeCapacity: 1,
});

// The handler for GET /{route+}.
const getHandler = async (event) => {
    // While handiling a request, we use the normal AWS NodeJS SDK to query and update DynomoDB.
    const awssdk = require("aws-sdk");
    const dynomo = new awssdk.DynamoDB.DocumentClient();

    // We've closed over the table we defined above, let's pluck off the name property, since we'll
    // use it when issuing DynomoDB requests. Note the call to `get()` here, table.name by itself is
    // an pulumi.Output<string>, and we want to get at the underlying string.
    const tableName = table.name.get();

    const route = event.pathParameters.route;

    // Get the existing count for the route.
    let value = (await dynomo.get({
        TableName: tableName,
        Key: { route }
    }).promise()).Item;

    let count = (value && value.count) || 0;

    // Increment the count and write it back to DynomoDB.
    await (dynomo.put({
        TableName: tableName,
        Item: { route, count: ++count }
    })).promise();

    console.log(`Got count ${count} for '${route}'`);

    return {
        statusCode: 200,
        body: JSON.stringify({ route, count })
    }
}

// Here, we define the actual API, we use the route handler we defined above (but we could
// define it inline with an arrow function if we wanted.
const api = new serverless.apigateway.API("api", {
    routes: [
        { method: "GET", path: "/{route+}", handler: getHandler }
    ]
});

module.exports.endpoint = api.url;
