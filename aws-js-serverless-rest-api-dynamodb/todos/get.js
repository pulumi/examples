let db = require("./db");
let AWS = require("aws-sdk");

module.exports.get = (event, context, callback) => {
    const dynamoDb = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName: db.table.name.get(),
        Key: {
            id: event.pathParameters.id,
        },
    };

    // fetch todo from the database
    dynamoDb.get(params, (error, result) => {
        // handle potential errors
        if (error) {
            console.error(error);
            callback(null, {
                statusCode: error.statusCode || 501,
                headers: { "Content-Type": "text/plain" },
                body: "Couldn't fetch the todo item.",
            });
            return;
        }

        // create a response
        const response = {
            statusCode: 200,
            body: JSON.stringify(result.Item),
        };
        callback(null, response);
    });
};
