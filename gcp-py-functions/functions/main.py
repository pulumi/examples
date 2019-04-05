"""Google Cloud Function source code for an ETA messaging app.

Defines a single Cloud Function endpoint, get_demo, which will compute the
estimated travel time to a location. If configured, will also send the result
via SMS.
"""

import os
from datetime import datetime
import googlemaps
import twilio.rest


def get_travel_time(origin, destination, offset):
    """Returns the estimated travel time using the Google Maps API.

    Returns: A string, such as '3 minutes'"""
    key = os.getenv("GOOGLE_MAPS_API_KEY", "")
    if key == "":
        return "[ENABLE GOOGLE MAPS TO DETERMINE TRAVEL TIME]"

    gmaps = googlemaps.Client(key=key)
    now = datetime.now()
    directions_result = gmaps.directions(
        origin=origin,
        destination=destination,
        mode="driving",
        departure_time=now)

    travel_time = directions_result[0]["legs"][0]["duration"]["value"]
    travel_time /= 60  # seconds to minutes
    travel_time += offset

    return "%d minutes" % travel_time

def send_text(message_body):
    """Sends an SMS using the Twilio API."""
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

def get_demo(request):
    """The Google Cloud Function computing estimated travel time."""

    # Get origin location from URL-query parameters.
    lat = request.args.get("lat")
    long = request.args.get("long")
    if lat and long:
        origin = "%s, %s" % (lat, long)
    else:
        origin = "Pulumi HQ, Seattle, WA"

    destination = os.getenv(
        "DESTINATION",
        "Space Needle, Seattle, WA")

    # Optional travel time offset, e.g. add a static 5m delay.
    travel_offset_str = os.getenv("TRAVEL_OFFSET", "0")
    travel_offset = int(travel_offset_str)

    travel_time_str = get_travel_time(
        origin=origin, destination=destination, offset=travel_offset)

    # Send the message. Returns a summary in the Cloud Function's response.
    message = "Hey! I'm leaving now, I'll be at '%s' to pick you up in about %s." % (
        destination, travel_time_str)
    return send_text(message)
