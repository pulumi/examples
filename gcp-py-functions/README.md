[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# GCP Functions

An example Pulumi component that deploys a Python function to Google Cloud Functions using a Google Cloud Bucket to store the code. The app takes in a destination and will send a text with your ETA to that location using Google Maps and Twilio. The app is also set up to run without these integrations to allow you to get started quickly.

You can connect a [Flic](https://flic.io) button using [IFTTT](https://ifttt.com) to automate sending this text.

## Running the App

1. Create a new stack:

    ```bash
    pulumi stack init gcp-py-functions
    ```

1. Configure GCP project and region:

    ```bash
    pulumi config set gcp:project <projectname>
    pulumi config set gcp:region <region>
    ```

1. Create a virtualenv and activate it

    ```bash
    virtualenv -p python3 venv
    source venv/bin/activate
    ```

1. Install python dependencies:

    ```bash
    pip3 install -r requirements.txt
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```bash
    $ pulumi up
    Previewing changes:
    ...

    Performing changes:
    ...
    Resources:
        + 4 created
    Duration: 1m2s
    ```

1. Check the deployed function endpoint (replace <YOUR_LATITUDE> & <YOUR_LONGITUDE>):

    ```BASH
    $ pulumi stack output fxn_url
    https://us-central1-pulumi-gcp-dev.cloudfunctions.net/eta_demo_function-40d1889
    $ curl "$(pulumi stack output fxn_url)?lat=<YOUR_LATITUDE>&long=<YOUR_LONGITUDE>"
    Sent text message to...
    ...
    ```

### Add in Google Maps

1. Get a [Google Maps](https://cloud.google.com/maps-platform/) API key by clicking 'Get started'.

    * Check the Routes and then click continue.
    * Select the GCP project you are deploying your Cloud function to.
    * Replace <INSERT_API_KEY> with the API key and run the following command:

1. Configure the API Key as a Pulumi secret by replacing <INSERT_API_KEY> and running the following command:

    ```bash
    pulumi config set googleMapsApiKey <INSERT_API_KEY> --secret
    ```

1. Configure your destination as a Pulumi secret by replacing <DESTINATION> and running the following command:

     ```bash
    pulumi config set destination <DESTINATION> --secret
    ```

1. [Optional] Configure an offset (i.e. it takes me 5 minutes to get down to my car), by running the following:

    ```bash
    pulumi config set travelOffset <TRAVEL_OFFSET> --secret
    ```

### Add in Texting with Twilio

1. Set up your [Twilio](https://www.twilio.com/) account.

1. Run the following commands based on your Twilio account:

    ```bash
    pulumi config set twillioAccessToken <TWILIO_ACCESS_TOKEN> --secret
    pulumi config set twillioAccountSid <TWILIO_ACCOUNT_SID> --secret
    pulumi config set fromPhoneNumber <FROM_PHONE_NUMBER> --secret
    ```

1. Add the number you would like notify by running the following:

    ```bash
    pulumi config set toPhoneNumber <TO_PHONE_NUMBER> --secret
    ```

### Set up the Flic Button

1. To set up the Flic button, install the Flic app on your phone and pair your phone. Enable location services for the Flic app and add an IFTTT for one of the click gestures.

1. Create a new Applet on IFTTT: "If You click a Flic, then Make a web request"
    * For "If" select the "Flic" service then " "Flic is clicked"
    * Select your Flic button and the appropriate gesture from the menu.
    * For "Then" select the "Make a web request" service
    * Under URL enter following (replace <FUNCTION_URL> with the value from `pulumi stack output fxn_url`): `<FUNCTION_URL>?long={{Longitude}}&lat={{Latitude}}`
