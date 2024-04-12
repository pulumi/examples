package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"

	"github.com/slack-go/slack"
	"github.com/slack-go/slack/slackevents"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
)

// Initialize a session that the SDK will use to load
// credentials from the shared credentials file ~/.aws/credentials
// and region from the shared configuration file ~/.aws/config.
var sess = session.Must(session.NewSessionWithOptions(session.Options{
	SharedConfigState: session.SharedConfigEnable,
}))

// Create DynamoDB client
var svc = dynamodb.New(sess)

// You more than likely want your "Bot User OAuth Access Token" which starts with "xoxb-"
var slackToken = os.Getenv("SLACK_TOKEN")
var slackApi = slack.New(slackToken)
var subscriptionsTableName = os.Getenv("SUBSCRIPTIONS_TABLE_NAME")

// handler is a simple function that takes a string and does a ToUpper.
func handler(request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	fmt.Print("Enter slackbot handler")

	// signingSecret := os.Getenv("SLACK_SIGNING_SECRET")

	fmt.Print("parsing body")
	body := json.RawMessage(request.Body)

	// if err != nil {
	// 	return events.APIGatewayProxyResponse{
	// 		StatusCode: 200,
	// 	}, nil
	// }
	// // sv, err := slack.NewSecretsVerifier(r.Header, signingSecret)
	// if err != nil {
	// 	return events.APIGatewayProxyResponse{
	// 		StatusCode: 200,
	// 	}, nil
	// }
	// if _, err := sv.Write(body); err != nil {
	// 	return events.APIGatewayProxyResponse{
	// 		StatusCode: 200,
	// 	}, nil
	// }
	// if err := sv.Ensure(); err != nil {
	// 	return events.APIGatewayProxyResponse{
	// 		StatusCode: 200,
	// 	}, nil
	// }
	// slackApi.PostMessage(ev.Channel, slack.MsgOptionText("Yes, hello.", false))

	fmt.Print("parsing event")
	eventsAPIEvent, err := slackevents.ParseEvent(body, slackevents.OptionNoVerifyToken())
	fmt.Print("event parsed")

	fmt.Print(eventsAPIEvent)

	if err != nil {
		fmt.Print(err)
		return events.APIGatewayProxyResponse{
			StatusCode: 200,
		}, nil
	}

	// Used in the slack app verification process to determine that this endpoint is correct
	if eventsAPIEvent.Type == slackevents.URLVerification {
		fmt.Print("Verification event detected")

		// Return the body of the request, which contains the challenge
		return events.APIGatewayProxyResponse{
			StatusCode: 200,
			Body:       request.Body,
		}, nil
	}

	// Triggered when the slackbot sends events
	if eventsAPIEvent.Type == slackevents.CallbackEvent {
		fmt.Print("Slack event")
		innerEvent := eventsAPIEvent.InnerEvent

		switch ev := innerEvent.Data.(type) {
		case *slackevents.AppMentionEvent:
			fmt.Print("Slack mention detected")

			// slackApi.PostMessage(ev.Channel, slack.MsgOptionText("Yes, hello.", false))

			// processAppMentionEvent(slackevents.AppMentionEvent(eventsAPIEvent.Data.(slackevents.AppMentionEvent)))
			processAppMentionEvent(*ev)

			return events.APIGatewayProxyResponse{
				StatusCode: 200,
				// TODO: Content type and challenge
			}, nil
		case *slackevents.MessageEvent:
			fmt.Print("Slack message detected")

			processMessageEvent(*ev)

			return events.APIGatewayProxyResponse{
				StatusCode: 200,
				// TODO: Content type and challenge
			}, nil
		}
	}

	fmt.Print("Event type not recognized, returning.")

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		// TODO: Content type and challenge
	}, nil
}

func processAppMentionEvent(event slackevents.AppMentionEvent) {
	if strings.Contains(event.Text, "unsubscribe") {
		unsubscribeFromMentions(event.User, event.Channel)
	} else {
		subscribeToMentions(event.User, event.Channel)
	}
}

func processMessageEvent(event slackevents.MessageEvent) {
	print("process event")

	// # find all values that match the shape <@ **** >
	search, _ := regexp.Compile("<@(.*?)>")
	matches := search.FindAllString(event.Text, -1)

	if len(matches) == 0 {
		fmt.Print("No matches found")
		// No @mentions in the message, so nothing to do
		return
	}

	for _, match := range matches {
		processMatch(event, match)
	}

}

func processMatch(event slackevents.MessageEvent, match string) {
	// Remove the <@ and > tags to grab the username / id
	id := strings.TrimLeft(strings.TrimRight(match, ">"), "<@")

	fmt.Printf("Process match " + id + " from " + event.Text)

	result, err := svc.GetItem(&dynamodb.GetItemInput{
		TableName: aws.String(subscriptionsTableName),
		Key: map[string]*dynamodb.AttributeValue{
			"id": {
				S: aws.String(id),
			},
		},
	})

	fmt.Printf("After get item")

	if err != nil {
		log.Fatalf("Got error calling GetItem: %s", err)
	}

	if result.Item == nil {
		fmt.Print("Could not find item")
		return
	}

	fmt.Printf("\nresult.Item exists\n")
	item := Subscription{}

	err = dynamodbattribute.UnmarshalMap(result.Item, &item)

	fmt.Printf("Item: ")

	if err != nil {
		panic(fmt.Sprintf("Failed to unmarshal Record, %v", err))
	}

	fmt.Printf("\nItem: channel:" + item.channel + " - id:" + item.id + " \n")
	fmt.Printf("\nBefore get permalink\n")

	permaLink := getPermalink(event.Channel, event.TimeStamp)

	fmt.Printf("\nAfter get permalink\n")

	fmt.Printf("\nNew mention at " + permaLink)

	message := "New mention at " + permaLink

	// sendChannelMessage(item.channel, message)
	sendChannelMessage(event.Channel, message)
}

func sendChannelMessage(channel string, text string) {
	fmt.Printf("\nSending channel message to " + channel + " saying " + text + "\n")
	_, _, err := slackApi.PostMessage(channel, slack.MsgOptionText(text, false))

	if nil != err {
		fmt.Print(err)
	}

}

// TODO: Figure out the permalink input and timestamp
func getPermalink(channel string, timestamp string) string {
	permalink, err := slackApi.GetPermalink(&slack.PermalinkParameters{Channel: channel, Ts: timestamp})

	if nil != err {
		fmt.Print("Error getting permalink")
		fmt.Print(err)
	}

	return permalink
}

func unsubscribeFromMentions(user string, channel string) {
	input := &dynamodb.DeleteItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"id": {
				S: aws.String(user),
			},
		},
		TableName: aws.String(subscriptionsTableName),
	}

	_, err := svc.DeleteItem(input)
	if err != nil {
		log.Fatalf("Got error calling DeleteItem: %s", err)
	}

	fmt.Println("Deleted " + user + " from table " + subscriptionsTableName)

	text := "Hi <@" + user + ">. You've been unsubscribed from @ mentions. Mention me again to resubscribe."
	sendChannelMessage(channel, text)
}

// Create struct to hold info about new item
type Subscription struct {
	id      string
	channel string
}

func subscribeToMentions(user string, channel string) {
	fmt.Print("Subscribe to mentions " + user + " in " + channel)
	// item := Subscription{
	// 	id:      user,
	// 	channel: channel,
	// }

	// // av, err := dynamodbattribute.MarshalMap(item)
	// if err != nil {
	// 	log.Fatalf("Got error marshalling new movie item: %s", err)
	// }

	input := &dynamodb.PutItemInput{
		Item: map[string]*dynamodb.AttributeValue{
			"id": {
				S: aws.String(user),
			},
			"channel": {
				S: aws.String(channel),
			},
		},
		TableName: aws.String(subscriptionsTableName),
	}

	_, err := svc.PutItem(input)
	if err != nil {
		log.Fatalf("\n Got error calling PutItem: %s \n", err)
	}

	fmt.Println("Successfully added " + user + " in " + channel + "to table " + subscriptionsTableName)

	text := "Hi <@" + user + ">. You've been subscribed to @ mentions. Send me a message containing 'unsubscribe' to stop receiving those notifications."

	sendChannelMessage(channel, text)
}

func main() {
	lambda.Start(handler)
}
