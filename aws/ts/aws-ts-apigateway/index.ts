// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as dynamoClient from "@aws-sdk/client-dynamodb";
import * as dynamoLib from "@aws-sdk/lib-dynamodb";

import * as aws from "@pulumi/aws";
import * as apigateway from "@pulumi/aws-apigateway";

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

const getHandler = new aws.lambda.CallbackFunction("GET", {
    policies: [aws.iam.ManagedPolicy.AWSLambdaVPCAccessExecutionRole, aws.iam.ManagedPolicy.LambdaFullAccess],
    callback: async (ev, ctx) => {
        const event = <any>ev;
        const route = event.pathParameters!["route"];
        console.log(`Getting count for '${route}'`);

        const dynoClient = new dynamoClient.DynamoDBClient({});
        const doc = dynamoLib.DynamoDBDocument.from(dynoClient);

        // get previous value and increment
        // reference outer `counterTable` object
        const tableData = await doc.get({
            TableName: counterTable.name.get(),
            Key: { id: route },
            ConsistentRead: true,
        });

        const value = tableData.Item;
        let count = (value && value.count) || 0;

        await doc.put({
            TableName: counterTable.name.get(),
            Item: { id: route, count: ++count },
        });

        console.log(`Got count ${count} for '${route}'`);
        return {
            statusCode: 200,
            body: JSON.stringify({ route, count }),
        };
    },
});

// Create an API endpoint
const endpoint = new apigateway.RestAPI("hello-world", {
    routes: [{
        path: "/{route+}",
        method: "GET",
        eventHandler: getHandler,
    }],
});

exports.endpoint = endpoint.url;
