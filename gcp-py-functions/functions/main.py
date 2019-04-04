from datetime import datetime
import googlemaps
import os
import twilio.rest


def get_demo(request):

    # Determine origin and destination
    lat = request.args.get("lat")
    long = request.args.get("long")
    if lat and long:
        origin = "%s, %s" % (request.args.get("lat"), request.args.get("long"))
    else:
        origin = "Moscone Center, San Francisco, CA"
    destination = os.getenv(
        "DESTINATION", "1525 4th Avenue #800, Seattle, WA 98101")

    # Get travel offset
    travel_offset_str = os.getenv("TRAVEL_OFFSET", "0")
    travel_offset = int(travel_offset_str)

    # Get travel time from origin to destination using Google Maps
    travel_time_str = getTravelTime(
        origin=origin, destination=destination, offset=travel_offset)

    # Construct text message body
    salutation = "Hey honey-bunny, letting you know I'm heading out to pick you up."
    specifics = "I'm leaving now, I'll be at '%s' to pick you up in about %s." % (
        destination, travel_time_str)
    signoff = "🏎️ vroom vroom"
    message_body = "%s\n%s\n\n%s" % (salutation, specifics, signoff)

    # Send text message using Twilio
    return sendText(message_body)


def getTravelTime(origin, destination, offset):
    gmapKey = os.getenv("GOOGLE_MAPS_API_KEY", "")
    if gmapKey:
        gmaps = googlemaps.Client(key=gmapKey)
        now = datetime.now()
        directions_result = gmaps.directions(origin=origin,
                                             destination=destination,
                                             mode="driving",
                                             departure_time=now)
        travel_time = directions_result[0]["legs"][0]["duration"]["value"]
        travel_time /= 60
        travel_time += offset
        return "%d minutes" % travel_time
    return "[ENABLE GOOGLE MAPS TO DETERMINE TRAVEL TIME]"


def sendText(message_body):
    to_number = os.getenv("TO_PHONE_NUMBER", "")
    from_number = os.getenv("FROM_PHONE_NUMBER", "")
    account_sid = os.getenv("TWILLIO_ACCOUNT_SID", "")
    auth_token = os.getenv("TWILLIO_ACCESS_TOKEN", "")
    if account_sid and auth_token and to_number and from_number:
        client = twilio.rest.Client(account_sid, auth_token)

        client.messages.create(
            to=to_number,
            from_=from_number,
            body=message_body)

        return "Sent text message to %s\n%s" % (to_number, message_body)
    return "[ENABLE TWILIO TO SEND A TEXT]: \n%s" % (message_body)
