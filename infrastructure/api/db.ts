import * as aws from "@pulumi/aws";

// Create a DynamoDB table for examples.
const examplesTable = new aws.dynamodb.Table("examples-table", {
    billingMode: "PAY_PER_REQUEST",
    hashKey: "id",
    attributes: [
        { name: "id", type: "S" },
    ],
});

export const examplesTableName = examplesTable.name;
