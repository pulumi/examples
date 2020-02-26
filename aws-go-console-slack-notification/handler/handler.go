package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func handler(ctx context.Context, event events.CloudWatchEvent) {
	var eventDetail eventDetail
	if err := json.Unmarshal(event.Detail, &eventDetail); err != nil {
		panic(err)
	}

	if eventDetail.UserAgent != "signin.amazonaws.com" {
		fmt.Printf("Skipping event [%s] from user agent [%s]", eventDetail.EventName, eventDetail.UserAgent)
		return
	}

	fmt.Printf("Processing event [%s] from user [%s]", eventDetail.EventName, eventDetail.UserIdentity.UserName)
	fmt.Printf("%s", event.Detail)

	slackMessageUsername := os.Getenv("SLACK_WEBHOOK_USERNAME")
	slackMessageText := os.Getenv("SLACK_MESSAGE_TEXT")
	if slackMessageText == "" {
		slackMessageText = ":rotating_light: A change was made via the AWS Console."
	}

	message := &slackMessage{
		Username: slackMessageUsername,
		Text:     slackMessageText,
		Attachments: []slackMessageAttachment{
			slackMessageAttachment{
				Fields: []slackMessageAttachmentField{
					slackMessageAttachmentField{
						Title: "AWS Account",
						Value: eventDetail.UserIdentity.AWSAccountID,
						Short: true,
					},
					slackMessageAttachmentField{
						Title: "Region",
						Value: eventDetail.AWSRegion,
						Short: true,
					},
					slackMessageAttachmentField{
						Title: "User",
						Value: eventDetail.UserIdentity.UserName,
						Short: true,
					},
					slackMessageAttachmentField{
						Title: "Event Name",
						Value: eventDetail.EventName,
						Short: true,
					},
				},
			},
		},
	}

	bytesRepresentation, err := json.Marshal(message)
	if err != nil {
		log.Fatalln(err)
	}

	_, err = http.Post(os.Getenv("SLACK_WEBHOOK_URL"), "application/json", bytes.NewBuffer(bytesRepresentation))
	if err != nil {
		log.Fatalln(err)
	}
}

type eventDetail struct {
	UserIdentity userIdentity `json:"userIdentity"`
	UserAgent    string       `json:"userAgent"`
	EventName    string       `json:"eventName"`
	AWSRegion    string       `json:"awsRegion"`
}

type userIdentity struct {
	AWSAccountID string `json:"accountId"`
	UserName     string `json:"userName"`
}

type slackMessage struct {
	Username    string                   `json:"username"`
	Text        string                   `json:"text"`
	Attachments []slackMessageAttachment `json:"attachments"`
}

type slackMessageAttachment struct {
	Pretext string                        `json:"pretext"`
	Text    string                        `json:"text"`
	Fields  []slackMessageAttachmentField `json:"fields"`
}

type slackMessageAttachmentField struct {
	Title string `json:"title"`
	Value string `json:"value"`
	Short bool   `json:"short"`
}

func main() {
	lambda.Start(handler)
}
