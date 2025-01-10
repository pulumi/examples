package main

import (
	"context"

	"github.com/aws/aws-lambda-go/lambda"
)

type MyEvent struct {
	Name string `json:"name"`
}

func HandleRequest(ctx context.Context) (string, error) {
	return "Pulumi <3 Go Lambda", nil
}

func main() {
	lambda.Start(HandleRequest)
}