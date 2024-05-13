package main

import (
	"strings"

	"github.com/aws/aws-lambda-go/lambda"
)

// handler is a simple function that takes a string and does a ToUpper.
func handler(str string) (string, error) {
	return strings.ToUpper(str), nil
}

func main() {
	lambda.Start(handler)
}
