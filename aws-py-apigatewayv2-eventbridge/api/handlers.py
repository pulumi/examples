# Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

import json

def capture_order(event, context):
    # For now, just log the event, including the uploaded document.
    # That'll be enough to verify everything's working.
    print(json.dumps({"source": event["source"], "detail": event["detail"]}))

