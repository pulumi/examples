[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Web Server Using Amazon EC2 (in Go)

This example deploys a simple AWS EC2 virtual machine running a Python web server. It uses Go as its infrastructure as
code language.

## Deploying the App

To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Go](https://golang.org/doc/install)
2. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
3. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)

### Steps

After cloning this repo, from this working directory, run these commands:

1. Restore your Go dependencies. This example currently uses [Dep](https://github.com/golang/dep) to do so:

    ```bash
    $ dep ensure
    ```

1. Go is a compiled language, so you must first compile it:

    ```bash
    $ go build -o go-webserver
    ```

2. Next, create a new Pulumi stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```

3. Set the required configuration variables for this program:

    ```bash
    $ pulumi config set aws:region us-east-1
    ```

4. Stand up the VM, which will also boot up your Python web server on port 80:

    ```bash
    $ pulumi up
    ```

5. After a couple minutes, your VM will be ready, and two stack outputs are printed:

    ```bash
    $ pulumi stack output
    Current stack outputs (2):
    OUTPUT          VALUE
    publicIp        53.40.227.82
    ```

6. Thanks to the security group making port 80 accessible to the 0.0.0.0/0 CIDR block, we can curl it:

    ```bash
    $ curl $(pulumi stack output publicIp)
    Hello, World!
    ```

7. From there, feel free to experiment. Simply making edits and running `pulumi up` will incrementally update your VM.

8. Afterwards, destroy your stack and remove it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```
