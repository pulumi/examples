def handler(event, context):
    # --- Add your own custom authorization logic here. ---
    print(event)
    return {
        "principalId": "my-user",
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [{
                "Action": "execute-api:Invoke",
                "Effect": "Allow" if event["headers"]["Authorization"] == "goodToken" else "Deny",
                "Resource": event["methodArn"],
            }]
        },
    }
