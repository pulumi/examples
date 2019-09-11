// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Create a mapping from 'route' to a count
const counterTable = new aws.dynamodb.Table("counterTable", {
    attributes: [{
        name: "id",
        type: "S",
    }],
    hashKey: "id",
    readCapacity: 5,
    writeCapacity: 5,
});

// Create an API endpoint
const endpoint = new awsx.apigateway.API("hello-world", {
    routes: [{
        path: "/{route+}",
        method: "GET",
        eventHandler: async (event) => {
            const route = event.pathParameters!["route"];
            console.log(`Getting count for '${route}'`);

            const client = new aws.sdk.DynamoDB.DocumentClient();

            // get previous value and increment
            // reference outer `counterTable` object
            const tableData = await client.get({
                TableName: counterTable.name.get(),
                Key: { id: route },
                ConsistentRead: true,
            }).promise();

            const value = tableData.Item;
            let count = (value && value.count) || 0;

            await client.put({
                TableName: counterTable.name.get(),
                Item: { id: route, count: ++count },
            }).promise();

            console.log(`Got count ${count} for '${route}'`);
            return {
                statusCode: 200,
                body: JSON.stringify({ route, count }),
            };
        },
    }],
});

exports.endpoint = endpoint.url;
