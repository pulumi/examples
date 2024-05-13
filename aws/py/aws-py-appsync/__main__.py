import json

import pulumi_random as random
from pulumi import Output, export
from pulumi_aws import appsync, dynamodb, iam

## Dynamo DB table to hold data for the GraphQL endpoint
table = dynamodb.Table(
    "tenants",
    hash_key="id",
    attributes=[dynamodb.TableAttributeArgs(
        name="id",
        type="S"
    )],
    read_capacity=1,
    write_capacity=1)

## Create IAM role and policy wiring
role = iam.Role(
    "iam-role",
    assume_role_policy=json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Action": "sts:AssumeRole",
            "Principal": {
                "Service": "appsync.amazonaws.com"
            },
            "Effect": "Allow",
        }]
    }))

policy = iam.Policy(
    "iam-policy",
    policy= Output.json_dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:GetItem"
            ],
            "Effect": "Allow",
            "Resource": [table.arn]
        }]
    }))

attachment = iam.RolePolicyAttachment(
    "iam-policy-attachment",
    role=role.name,
    policy_arn=policy.arn)

## GraphQL Schema
schema = """
type Query {
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
    }
"""

## Create API accessible with a key
api = appsync.GraphQLApi(
    "key",
    authentication_type="API_KEY",
    schema=schema
)

api_key = appsync.ApiKey(
    "key",
    api_id=api.id)

random_string = random.RandomString(
    "random-datasource-name",
    length=15,
    special=False,
    number=False,
)

## Link a data source to the Dynamo DB Table
data_source = appsync.DataSource(
    "tenants-ds",
    name=random_string.result,
    api_id=api.id,
    type="AMAZON_DYNAMODB",
    dynamodb_config=appsync.DataSourceDynamodbConfigArgs(
        table_name=table.name,
    ),
    service_role_arn=role.arn)

## A resolver for the [getTenantById] query
get_resolver = appsync.Resolver(
    "get-resolver",
    api_id=api.id,
    data_source=data_source.name,
    type="Query",
    field="getTenantById",
    request_template="""{
        "version": "2017-02-28",
        "operation": "GetItem",
        "key": {
            "id": $util.dynamodb.toDynamoDBJson($ctx.args.id),
        }
    }
    """,
    response_template="$util.toJson($ctx.result)")

## A resolver for the [addTenant] mutation
add_resolver = appsync.Resolver(
    "add-resolver",
    api_id=api.id,
    data_source=data_source.name,
    type="Mutation",
    field="addTenant",
    request_template="""{
        "version" : "2017-02-28",
        "operation" : "PutItem",
        "key" : {
            "id" : $util.dynamodb.toDynamoDBJson($ctx.args.id)
        },
        "attributeValues" : {
            "name": $util.dynamodb.toDynamoDBJson($ctx.args.name)
        }
    }
    """,
    response_template="$util.toJson($ctx.result)")

export("endpoint", api.uris["GRAPHQL"])
export("key", api_key.key)
