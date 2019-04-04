from twilio.rest import Client
import os


def hello_get(request):
    """HTTP Cloud Function.
    Args:
        request (flask.Request): The request object.
        <http://flask.pocoo.org/docs/1.0/api/#flask.Request>
    Returns:
        The response text, or any set of values that can be turned into a
        Response object using `make_response`
        <http://flask.pocoo.org/docs/1.0/api/#flask.Flask.make_response>.
    """

    account_sid = os.getenv("TWILLIO_ACCOUNT_SID", "")
    auth_token = os.getenv("TWILLIO_ACCESS_TOKEN", "")
    client = Client(account_sid, auth_token)

    message = client.messages.create(
        to=os.getenv("TO_PHONE_NUMBER", ""),
        from_=os.getenv("FROM_PHONE_NUMBER", ""),
        body="Im on my way!")

    return "Message: %s sent" % (message.sid)
