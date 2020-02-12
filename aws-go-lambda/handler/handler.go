package handler

import (
	"github.com/aws/aws-lambda-go/lambda"
)

func Handler() (string, error) {
	return "hello", nil
}

func main() {
	lambda.Start(Handler)
}
