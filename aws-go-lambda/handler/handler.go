package main

import (
	"strings"

	"github.com/aws/aws-lambda-go/lambda"
)

func handler(str string) (string, error) {
	return strings.ToUpper(str), nil
}

func main() {
	lambda.Start(handler)
}
