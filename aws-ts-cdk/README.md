[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Using CDK Constructs from Pulumi

This example highlights how you can use CDK constructs from within Pulumi applications.  CDK
Constructs can be mixed with other Pulumi resources, including both Pulumi AWS resources, as well as
Azure, GCP, Kubernetes and more.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install Node.js 8.11.3](https://nodejs.org/en/download/)

### Steps

After cloning this repo, from this working directory, run these commands:

1. Install the required Node.js packages:

    ```bash
    $ npm install
    ```

2. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```

3. Set the required configuration variables for this program:

    ```bash
    $ pulumi config set aws:region us-west-2
    ```

4. Stand up the Lambda function and cron event source:

    ```bash
    $ pulumi up
    ```

5. Make a change to the code - for example - change `PYTHON_3_6` to `PYTHON_3_7` to use a newer
   Python runtime, then re-deploy these changes.

    ```bash
    $ pulumi up
    ```

8. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```

