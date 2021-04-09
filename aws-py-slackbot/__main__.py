
# re -> regular expression package
import re
import json
import boto3
import requests
import iam
import base64
# import slack_sdk as slack

import pulumi
import pulumi_aws as aws


# // A simple slack bot that, when requested, will monitor for @mentions of your name and post them to
# // the channel you contacted the bot from.

# TODO: Should this mentionbot be stored in pulumi backend?
config = pulumi.Config("mentionbot")
slack_token = config.get("slackToken")
verification_token = config.get("verificationToken")

#  Make a simple table that keeps track of which users have requested to be notified when their name
#  is mentioned, and which channel they'll be notified in.
subscriptions_table = aws.dynamodb.Table('subscriptions',
  attributes=[
    aws.dynamodb.TableAttributeArgs(
      name="id",
      type="S",
    )
  ],
  billing_mode="PAY_PER_REQUEST",
  hash_key="id"
)

# Slack has strict requirements on how fast you must be when responding to their messages. In order
# to ensure we don't respond too slowly, all we do is enqueue messages to this topic, and then
# return immediately.
# message_bus = aws.cloudwatch.EventBus('messages')
# message_bus = 

##################
## Lambda Function
##################

# Create a Lambda function, using code from the `./app` folder.
lambda_func = aws.lambda_.Function("mention-processing-lambda",
    role=iam.lambda_role.arn,
    runtime="python3.7",
    handler="__main__.webhook_handler",
    code=pulumi.AssetArchive({
        '.': pulumi.FileArchive('.')
    })
)

#############################################
## APIGateway RestAPI
# Provide webhooks for slack to send events
#############################################
region = aws.config.region
custom_stage_name = 'slackbot-example'

# Create a single Swagger spec route handler for a Lambda function.
def swagger_route_handler(arn):
    return ({
        "x-amazon-apigateway-any-method": {
            "x-amazon-apigateway-integration": {
                "uri": f'arn:aws:apigateway:{region}:lambda:path/2015-03-31/functions/{arn}/invocations',
                "passthroughBehavior": "when_no_match",
                "httpMethod": "POST",
                "type": "aws_proxy",
            },
        },
    })

# Create the API Gateway Rest API, using a swagger spec.
rest_api = aws.apigateway.RestApi("mentionbot",
    body=lambda_func.arn.apply(lambda arn: json.dumps({
        "swagger": "2.0",
        "info": {"title": "slackbot-webhooks", "version": "1.0"},
        "paths": {
            "/{proxy+}": swagger_route_handler(arn),
        },
    })))

# Create a deployment of the Rest API.
deployment = aws.apigateway.Deployment("api-deployment",
    rest_api=rest_api.id,
    # Note: Set to empty to avoid creating an implicit stage, we'll create it
    # explicitly below instead.
    stage_name="",
)

# Create a stage, which is an addressable instance of the Rest API. Set it to point at the latest deployment.
stage = aws.apigateway.Stage("api-stage",
    rest_api=rest_api.id,
    deployment=deployment.id,
    stage_name=custom_stage_name,
)

# Give permissions from API Gateway to invoke the Lambda
invoke_permission = aws.lambda_.Permission("api-lambda-permission",
    action="lambda:invokeFunction",
    function=lambda_func.name,
    principal="apigateway.amazonaws.com",
    source_arn=deployment.execution_arn.apply(lambda arn: arn + "*/*"),
)

###################################################
#
# Lambda function to handle slack webhooks
#
###################################################

def webhook_handler(event):
    try:
        if not slack_token:
            raise Exception("mentionbot:slackToken was not provided")
        if not verification_token:
            raise Exception("mentionbot:verificationToken was not provided")

        print(event.body)

        if not event.isBase64Encodeded or not event.body:
            print('Unexpected content received')
            print(event)
        else:
            # TODO: Parse buffer
            # const parsed = JSON.parse(Buffer.from(event.body, "base64").toString());
            parsed = event.body
            if parsed.type == "url_verification":
                # url_verification is the simple message slack sends to our endpoint to
                # just make sure we're setup properly.  All we have to do is get the
                # challenge data they send us and return it untouched.
                verification_request = parsed
                challenge = verification_request.challenge
                
                return {
                    "statusCode": 200,
                    "body": json.dumps({"challenge": challenge})
                }

            elif parsed.type == 'event_callback':
                event_request = parsed

                if event_request.token != verification_token:
                    print("Error: Invalid verification token")
                    
                    return { 
                        "statusCode": 401,
                        "body": "Invalid verification token"
                    }

                else:
                    on_event_callback(event_request)
            else:
                print("Unknown event type: " + parsed.type)
    except Exception as err:
        print(err)
        # Fall through. Even in the event of an error, we want to return '200' so that slack
        # doesn't just repeat the message, causing the same error.

        # Always return success so that Slack doesn't just immediately resend this message to us.
        return { "statusCode": 200, "body": "" }

# [x] First Draft Completed
# [ ] Tested
def on_event_callback(request):
    if not hasattr(request, 'event'):
        # No event in request, not processing any further.
        return

    event = request.event

    if "message" == event.event_type:
        on_message_event_callback(event)
    elif "app_mention" == event.event_type:
        on_app_mention_event_callback(event)
    else:
        print("Unknown event type: " + event.event_type)

def process_match(match):
    print(match)

# [] written
# [] Tested
def on_message_event_callback(request):
    event = request.event
    if not event.text:
        # No text for the message, so nothing to do.
        return

    matches = re.findall(r"/<@[A-Z0-9]+>/gi", event.text)

    if not matches:
        # No @mentions in the message, so nothing to do.
        return

    # There might be multiple @mentions to the same person in the same message.
    # So make into a set to make things unique.
    for match in list(set(matches)):
        process_match(match)

# sendChannelMessage
# [ ] first draft
# [ ] tested
def send_channel_message(channel, text):
    message = { "token": slack_token, "channel": channel, "text": text}
    r = requests.get('https://slack.com/api/chat.postMessage?' + json.dumps(message))

def get_permalink(channel, timestamp):
    message = { "token": slack_token, "channel": channel, "message_ts": timestamp }
    r = requests.get('https://slack.com/api/chat.getPermalink?' + json.dumps(message))
    return r.json().permalink

def on_app_mention_event_callback(request):
    event = request.event
    if "unsubscribe" in event.lower():
        unsubscribe_from_mentions(event)
    else:
        subscribe_to_mentions(event)

# async function onAppMentionEventCallback(request: EventCallbackRequest) {
#     // Got an app_mention to @mentionbot.
#     const event = request.event;
#     const promise = event.text.toLowerCase().indexOf("unsubscribe") >= 0
#         ? unsubscribeFromMentions(event)
#         : subscribeToMentions(event);

#     return await promise;
# }

def unsubscribe_from_mentions(event):
    client = boto3.client('dynamodb')
    client.delete_item(
        TableName = subscriptions_table.name,
        Key = {
            "id": {
                "S": event.user
            }
        }
    )
    text = "Hi <@" + event.user + ">. You've been unsubscribed from @ mentions. Mention me again to resubscribe."
    send_channel_message(event.channel, text)

def subscribe_to_mentions(event):
    channel = event.channel
    print(channel)
    dynamodb_client = boto3.client('dynamodb')
    dynamodb_client.put(
        TableName = subscriptions_table.name,
        Item = {
            "id": event.user,
            "channel": event.channel
        }
    )
    text = "Hi <@"+event.user+">. You've been subscribed to @ mentions. Send me a message containing 'unsubscribe' to stop receiving those notifications."
    send_channel_message(event.channel, text)

# export const url = endpoint.url;
