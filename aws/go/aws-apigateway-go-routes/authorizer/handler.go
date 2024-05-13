// Copyright 2016-2021, Pulumi Corporation.
package main

import (
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func handler(request events.APIGatewayCustomAuthorizerRequestTypeRequest) (events.APIGatewayCustomAuthorizerResponse, error) {
	var effect string
	if request.Headers["Authorization"] == "goodToken" {
		effect = "Allow"
	} else {
		effect = "Deny"
	}
	return events.APIGatewayCustomAuthorizerResponse{
		PrincipalID: "my-user",
		PolicyDocument: events.APIGatewayCustomAuthorizerPolicy{
			Version: "2012-10-17",
			Statement: []events.IAMPolicyStatement{
				{
					Action:   []string{"execute-api:Invoke"},
					Effect:   effect,
					Resource: []string{request.MethodArn},
				},
			},
		},
	}, nil
}

func main() {
	lambda.Start(handler)
}
