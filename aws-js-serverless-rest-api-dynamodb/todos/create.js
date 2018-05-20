let db = require("./db");
let uuid = require("uuid");
let AWS = require("aws-sdk");

module.exports.create = (event, context, callback) => {
    const dynamoDb = new AWS.DynamoDB.DocumentClient();
    const timestamp = new Date().getTime();
    const data = JSON.parse(event.body);
    if (typeof data.text !== "string") {
        console.error("Validation Failed");
        callback(null, {
            statusCode: 400,
            headers: { "Content-Type": "text/plain" },
            body: "Couldn\"t create the todo item.",
        });
        return;
    }

    const params = {
        TableName: db.table.name.get(),
        Item: {
            id: uuid.v1(),
            text: data.text,
            checked: false,
            createdAt: timestamp,
            updatedAt: timestamp,
        },
    };

    // write the todo to the database
    dynamoDb.put(params, (error) => {
        // handle potential errors
        if (error) {
            console.error(error);
            callback(null, {
                statusCode: error.statusCode || 501,
                headers: { "Content-Type": "text/plain" },
                body: "Couldn't create the todo item.",
            });
            return;
        }

        // create a response
        const response = {
            statusCode: 200,
            body: JSON.stringify(params.Item),
        };
        callback(null, response);
    });
}
