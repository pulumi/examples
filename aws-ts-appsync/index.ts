import * as aws from "@pulumi/aws";
import { createIamRole } from "./iam";

// Dynamo DB table to hold data for the GraphQL endpoint
const table = new aws.dynamodb.Table("tenants", {
    name: "Tenant",
    hashKey: "id",
    attributes: [{ name: "id", type: "S" }],
    readCapacity: 1,
    writeCapacity: 1,
});

// Create IAM role and policy wiring
const role = createIamRole("iam", table);

// GraphQL Schema
const schema = 
    `type Query {
        getTenantById(id: ID!): Tenant
    }

    type Mutation {
        addTenant(id: ID!, name: String!): Tenant!
    }

    type Tenant {
        id: ID!
        name: String
    }

    schema {
        query: Query
        mutation: Mutation
    }`;

// Create API accessible with a key
const api = new aws.appsync.GraphQLApi("api", {
    authenticationType: "API_KEY",
    schema,
});
const apiKey = new aws.appsync.ApiKey("key", {
    apiId: api.id,
});

// Link a data source to the Dynamo DB Table
const dataSource = new aws.appsync.DataSource("tenants-ds", {
    name: "TenantsDataSource",
    apiId: api.id,
    type: "AMAZON_DYNAMODB",
    dynamodbConfig: {
        tableName: table.name,
    },
    serviceRoleArn: role.arn,
});

// A resolver for the [getTenantById] query
new aws.appsync.Resolver("get-resolver", {
    apiId: api.id,
    dataSource: dataSource.name,
    type: "Query",
    field: "getTenantById",
    requestTemplate: `{
        "version": "2017-02-28",
        "operation": "GetItem",
        "key": {
            "id": $util.dynamodb.toDynamoDBJson($ctx.args.id),
        }
    }`,
    responseTemplate: `$util.toJson($ctx.result)`
});

// A resolver for the [addTenant] mutation
new aws.appsync.Resolver("add-resolver", {
    apiId: api.id,
    dataSource: dataSource.name,
    type: "Mutation",
    field: "addTenant",
    requestTemplate: `{
        "version" : "2017-02-28",
        "operation" : "PutItem",
        "key" : {
            "id" : $util.dynamodb.toDynamoDBJson($ctx.args.id)
        },
        "attributeValues" : {
            "name": $util.dynamodb.toDynamoDBJson($ctx.args.name)
        }
    }`,
    responseTemplate: `$util.toJson($ctx.result)`
});

export const endpoint = api.uris["GRAPHQL"];
export const key = apiKey.key;

/**
 *
 * An example query:
 *
 
    query GetTenant {
        getTenantById(id: "123") {
            id
            name
        }
    }

 *
 * An example mutation:
 * 
 
    mutation AddTenant {
        addTenant(id: "123", name: "First Corp") {
            id
            name
        }
    }

 *
 */
