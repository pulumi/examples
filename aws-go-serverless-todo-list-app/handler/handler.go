package main

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

type ToDo struct {
	ID      string `json:"id"`
	Summary string `json:"summary"`
}

func GetToDo() ([]ToDo, error) {
	todoList := []ToDo{}
	svc := dynamodb.New(session.New())
	input := &dynamodb.ScanInput{
		TableName: aws.String(os.Getenv("TABLE")),
	}

	err := svc.ScanPages(input, func(page *dynamodb.ScanOutput, last bool) bool {
		todos := []ToDo{}
		dynamodbattribute.UnmarshalListOfMaps(page.Items, &todos)
		todoList = append(todoList, todos...)
		return true
	})
	if err != nil {
		return nil, err
	}

	return todoList, nil
}

func AddToDo(summary string) error {
	svc := dynamodb.New(session.New())
	todo := ToDo{
		ID:      fmt.Sprint(time.Now().Unix()),
		Summary: summary,
	}
	av, err := dynamodbattribute.MarshalMap(todo)
	if err != nil {
		return err
	}
	input := &dynamodb.PutItemInput{
		TableName: aws.String(os.Getenv("TABLE")),
		Item:      av,
	}

	_, err = svc.PutItem(input)
	if err != nil {
		return err
	}

	return nil
}

func DeleteToDo(id string) error {
	svc := dynamodb.New(session.New())
	input := &dynamodb.DeleteItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"id": {
				S: aws.String(id),
			},
		},
		TableName: aws.String(os.Getenv("TABLE")),
	}

	_, err := svc.DeleteItem(input)
	if err != nil {
		return err
	}
	return nil
}

func GenerateAPIResponse(status int, body string) events.APIGatewayProxyResponse {
	return events.APIGatewayProxyResponse{
		StatusCode: status,
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
		Body: body,
	}
}

// handler is creating, updating and deleting To-Do list
func handler(request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	responseBody := ""

	// Get all To-Do list
	if request.HTTPMethod == "GET" {
		todoList, err := GetToDo()
		if err != nil {
			return GenerateAPIResponse(500, "Failed to get To-Do list"), nil
		}
		jsonb, err := json.Marshal(todoList)
		if err != nil {
			return GenerateAPIResponse(500, "Failed to get To-Do list"), nil
		}
		responseBody = string(jsonb)
	}

	// Delete To-Do item
	if request.HTTPMethod == "DELETE" {
		id := request.PathParameters["id"]
		if err := DeleteToDo(id); err != nil {
			return GenerateAPIResponse(500, "Failed to delete To-Do"), nil
		}
		responseBody = "Successfully deleted the To-Do item"
	}

	// Put To-Do item
	if request.HTTPMethod == "POST" {
		todo := ToDo{}
		requestBody := []byte(request.Body)
		if err := json.Unmarshal(requestBody, &todo); err != nil {
			return GenerateAPIResponse(400, "Request body is invalid"), nil
		}
		if err := AddToDo(todo.Summary); err != nil {
			return GenerateAPIResponse(500, "Failed to add To-Do"), nil
		}

		responseBody = "Successfully added the To-Do item"
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       responseBody,
	}, nil
}

func main() {
	lambda.Start(handler)
}
