[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-py-functions/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-py-functions/README.md#gh-dark-mode-only)

# Google Cloud Functions in Python

This example shows how to deploy a Python-based Google Cloud Function.

The deployed Cloud Function allows you to notify a friend via SMS about how long it will take to arrive at a location. This uses the Google Maps API and Twilio, and also benefits from using a [Flic button](https://flic.io) and [IFTTT](https://ifttt.com). But none of that is necessary to use Pulumi to provision the Google Cloud Platform functions.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure GCP credentials](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
3. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Configure the GCP project and region:

    ```bash
    pulumi config set gcp:project <projectname>
    pulumi config set gcp:region <region>
    ```

1. Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```bash
    pulumi up
    ```

    ```
    Resources:
        + 4 created
    Duration: 1m2s
    ```

1. Once the application is deployed, you can start accessing the Google Cloud Function by making an HTTP request to the function's endpoint. It is exported from the stack as `fxn_url`:

    ```bash
    pulumi stack output fxn_url
    ```

    ```
    https://us-central1-pulumi-gcp-dev.cloudfunctions.net/eta_demo_function...
    ```

    You can specify a starting location via latitude and longitude coordinates via URL query parameters. (You can find your current location on [https://www.latlong.net/](https://www.latlong.net/).)

    ```bash
    curl "$(pulumi stack output fxn_url)?lat=<YOUR_LATITUDE>&long=<YOUR_LONGITUDE>"
    ```

    ```
    Sent text message to...
    ```

## Configuration

### Google Maps for travel time

The application uses the [Google Maps API](https://developers.google.com/maps/documentation/) to estimate travel time data. To set this up:

1. Get a [Google Maps](https://cloud.google.com/maps-platform/) API key by clicking 'Get started'.

    * Check the Routes and then click continue.
    * Select the GCP project you are deploying your Cloud Function to.

1. Update the stack's configuration, encrypting the API key value:

    ```bash
    pulumi config set googleMapsApiKey <INSERT_API_KEY> --secret
    ```

1. Set the target destination to compute directions to:

    ```bash
    pulumi config set destination <DESTINATION>
    ```

1. (Optional) Add a travel time offset, e.g. add 5 minutes to the estimate.

    ```bash
    pulumi config set travelOffset <TRAVEL_OFFSET>
    ```

1. Run `pulumi up` to re-deploy your Cloud Function with the new configuration.

### Twilio for SMS notifications

To have the Cloud Function send a text message, you'll need a Twilio key too:

1. Log into your [Twilio](https://www.twilio.com/) account, and create a new access token and/or phone number to send SMS messages from.

1. Add the Twilio configuration data to your Pulumi stack:

    ```bash
    pulumi config set twillioAccessToken <TWILIO_ACCESS_TOKEN> --secret
    pulumi config set twillioAccountSid <TWILIO_ACCOUNT_SID> --secret
    pulumi config set fromPhoneNumber <FROM_PHONE_NUMBER>
    ```

1. Enter the phone number the Cloud Function will send messages to:

    ```bash
    pulumi config set toPhoneNumber <TO_PHONE_NUMBER> --secret
    ```

1. Run `pulumi up` to re-deploy your Cloud Function with the new configuration.

### Flic button to trigger the Cloud Function

With Pulumi having set up the cloud infrastructure, the next step is to have a simple way to trigger it. With [Flic](https://flic.io) you can trigger the Cloud Function with literally the push of a button.

To make sure to include the button presser's location, you can use [IFTTT](https://ifttt.com).

1. Install the Flic app on your phone and pair your button. Enable location services for the Flic app and add an IFTTT for one of the click gestures.

1. Create a new Applet on IFTTT: "If You click a Flic, then Make a web request"
    * For "If" select the "Flic" service then "Flic is clicked".
    * Select your Flic button and the appropriate gesture from the menu.
    * For "Then" select the "Make a web request" service
    * Under URL enter following (replace `<FUNCTION_URL>` with the value from `pulumi stack output fxn_url`): `<FUNCTION_URL>?long={{Longitude}}&lat={{Latitude}}`

## Cleaning up

Once you're finished experimenting, destroy your stack and remove it:

```bash
pulumi destroy
pulumi stack rm
```
