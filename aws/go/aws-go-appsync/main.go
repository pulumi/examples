package main

import (
	"encoding/json"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/appsync"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/dynamodb"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/iam"
	"github.com/pulumi/pulumi-random/sdk/v4/go/random"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {

		// Create a Dynamo DB
		table, err := dynamodb.NewTable(ctx, "tenants", &dynamodb.TableArgs{
			Attributes: dynamodb.TableAttributeArray{
				&dynamodb.TableAttributeArgs{
					Name: pulumi.String("id"),
					Type: pulumi.String("S"),
				},
			},
			HashKey:       pulumi.String("id"),
			ReadCapacity:  pulumi.Int(1),
			WriteCapacity: pulumi.Int(1),
		})
		if err != nil {
			return err
		}

		// create IAM role and policy wiring
		assumeRolePolicyJSON, err := json.Marshal(map[string]interface{}{
			"Version": "2012-10-17",
			"Statement": []interface{}{
				map[string]interface{}{
					"Action": "sts:AssumeRole",
					"Principal": map[string]interface{}{
						"Service": "appsync.amazonaws.com",
					},
					"Effect": "Allow",
				},
			},
		})
		if err != nil {
			return err
		}
		role, err := iam.NewRole(ctx, "iam-role", &iam.RoleArgs{
			AssumeRolePolicy: pulumi.String(assumeRolePolicyJSON),
		})
		if err != nil {
			return err
		}

		tempPolicy := table.Arn.ApplyT(func(arn string) (string, error) {
			policyJSON, err := json.Marshal(map[string]interface{}{
				"Version": "2012-10-17",
				"Statement": []interface{}{
					map[string]interface{}{
						"Action": []string{
							"dynamodb:PutItem",
							"dynamodb:GetItem",
						},
						"Effect": "Allow",
						"Resource": []string{
							arn,
						},
					},
				},
			})
			if err != nil {
				return "", err
			}
			return string(policyJSON), nil
		})

		policy, err := iam.NewPolicy(ctx, "iam-policy", &iam.PolicyArgs{
			Policy: tempPolicy,
		})
		if err != nil {
			return err
		}

		_, err = iam.NewRolePolicyAttachment(ctx, "iamPolicyAttachment", &iam.RolePolicyAttachmentArgs{
			Role:      role.Name,
			PolicyArn: policy.Arn,
		})
		if err != nil {
			return err
		}

		// Create an API accessible with a key
		api, err := appsync.NewGraphQLApi(ctx, "key", &appsync.GraphQLApiArgs{
			AuthenticationType: pulumi.String("API_KEY"),
			Schema: pulumi.String(`
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
			}`),
		})
		if err != nil {
			return err
		}

		// key to access the API
		apiKey, err := appsync.NewApiKey(ctx, "key", &appsync.ApiKeyArgs{
			ApiId: api.ID(),
		})
		if err != nil {
			return err
		}

		// Generate random string
		randStr, err := random.NewRandomString(ctx, "random-datasource-name", &random.RandomStringArgs{
			Length:  pulumi.Int(15),
			Special: pulumi.BoolPtr(false),
			Number:  pulumi.BoolPtr(false),
		})
		if err != nil {
			return err
		}

		// Link the data source to the Dynamo DB Table
		dataSource, err := appsync.NewDataSource(ctx, "tenants-DS", &appsync.DataSourceArgs{
			Name:  randStr.Result,
			ApiId: api.ID(),
			Type:  pulumi.String("AMAZON_DYNAMODB"),
			DynamodbConfig: &appsync.DataSourceDynamodbConfigArgs{
				TableName: table.Name,
			},
			ServiceRoleArn: role.Arn,
		})
		if err != nil {
			return err
		}

		// Resolver for [getTenantById] query
		_, err = appsync.NewResolver(ctx, "getResolver", &appsync.ResolverArgs{
			ApiId:      api.ID(),
			Type:       pulumi.String("Query"),
			DataSource: dataSource.Name,
			Field:      pulumi.String("getTenantById"),
			RequestTemplate: pulumi.String(`{
				"version": "2017-02-28",
				"operation": "GetItem",
				"key": {
					"id": $util.dynamodb.toDynamoDBJson($ctx.args.id),
				}
			}`),
			ResponseTemplate: pulumi.String(`$util.toJson($ctx.result)`),
		})
		if err != nil {
			return err
		}

		// Resolver for [addTenant] mutation
		_, err = appsync.NewResolver(ctx, "addResolver", &appsync.ResolverArgs{
			ApiId:      api.ID(),
			Type:       pulumi.String("Mutation"),
			DataSource: dataSource.Name,
			Field:      pulumi.String("addTenant"),
			RequestTemplate: pulumi.String(`{
				"version" : "2017-02-28",
				"operation" : "PutItem",
				"key" : {
					"id" : $util.dynamodb.toDynamoDBJson($ctx.args.id)
				},
				"attributeValues" : {
					"name": $util.dynamodb.toDynamoDBJson($ctx.args.name)
				}
			}`),
			ResponseTemplate: pulumi.String(`$util.toJson($ctx.result)`),
		})
		if err != nil {
			return err
		}

		// Export
		endptURL := api.Uris.MapIndex(pulumi.String("GRAPHQL")) // how to retrieve the value at index "GRAPHQL"

		ctx.Export("endpoint", endptURL)
		ctx.Export("key", apiKey.Key)
		return nil
	})
}
