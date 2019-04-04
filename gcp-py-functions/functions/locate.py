from datetime import datetime
import googlemaps
import os
import twilio.rest


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

    # Get configurable values
    to_number = os.getenv("TO_PHONE_NUMBER", "")
    origin = "%s, %s" % (request.args.get("lat"), request.args.get("long"))
    destination = os.getenv(
        "DESTINATION", "1525 4th Avenue #800, Seattle, WA 98101")

    # Google Maps
    gmaps = googlemaps.Client(key=os.getenv("GOOGLE_MAPS_API_KEY", ""))
    now = datetime.now()
    directions_result = gmaps.directions(origin=origin,
                                         destination=destination,
                                         mode="driving",
                                         departure_time=now)

    travel_time = directions_result[0]["legs"][0]["duration"]["value"]

    # Construct text message body
    salutation = "Hey honey-bunny, letting you know I'm heading out to pick you up."
    specifics = "I'm leaving now, I'll be at '%s' to pick you up in about %d minutes." % (
        destination, travel_time / 60)
    signoff = "🏎️ vroom vroom"
    message_body = "%s\n%s\n\n%s" % (salutation, specifics, signoff)

    # Send text message using Twillio
    account_sid = os.getenv("TWILLIO_ACCOUNT_SID", "")
    auth_token = os.getenv("TWILLIO_ACCESS_TOKEN", "")
    client = twilio.rest.Client(account_sid, auth_token)

    message = client.messages.create(
        to=to_number,
        from_=os.getenv("FROM_PHONE_NUMBER", ""),
        body=message_body)

    return "Sent text message to %s\n%s" % (to_number, message_body)
