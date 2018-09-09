let db = require("./db");
let AWS = require("aws-sdk");

module.exports.list = (event, context, callback) => {
    const dynamoDb = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: db.table.name.get(),
    };

    // fetch all todos from the database
    dynamoDb.scan(params, (error, result) => {
        // handle potential errors
        if (error) {
            console.error(error);
            callback(null, {
                statusCode: error.statusCode || 501,
                headers: { "Content-Type": "text/plain" },
                body: "Couldn't fetch the todos.",
            });
            return;
        }

        // create a response
        const response = {
            statusCode: 200,
            body: JSON.stringify(result.Items),
        };
        callback(null, response);
    });
};
