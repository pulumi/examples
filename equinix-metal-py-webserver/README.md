[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Equinix Metal Webserver

This example demonstrates creating a webserver in Equinix Metal with Python

# Running the Example

After cloning this repo, `cd` into it and run these commands.

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```
   
1. Install all of the dependencies for the application:

1. Create a Python virtualenv, activate it, and install dependencies:

    This installs the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program.

    ```bash
    $ python3 -m venv venv
    $ source venv/bin/activate
    $ pip3 install -r requirements.txt
    ```

1. Deploy everything with the `pulumi up` command. This provisions the webserver:

    ```bash
    $ pulumi up
    ```

1. After a couple minutes, your webserver will be ready.

    ```bash
    $ pulumi up
    ...

    Outputs:
      + ip  : "147.75.65.213"
      + name: "new-vervet"
    ```

1. Once you are done, you can destroy all of the resources, and the stack:

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```
