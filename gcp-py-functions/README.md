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
    info: 6 changes performed:
        + 6 resources created
    Update duration: 39.65130324s
    ```

1. Check the deployed function endpoint:

    ```BASH
    $ pulumi stack output fxn_url
    https://us-central1-pulumi-gcp-dev.cloudfunctions.net/eta_demo_function-40d1889
    $ curl "$(pulumi stack output fxn_url)?lat=<YOUR_LATITUDE>&long=<YOUR_LONGITUDE>"
    Sent text message to...
    ...
    ```

1. [TODO] Google Maps

1. [TODO] Twilio

1. [TODO] IFTT
