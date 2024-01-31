[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-py-webserver/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-py-webserver/README.md#gh-dark-mode-only)

# Web Server Using Compute Engine

Starting point for building the Pulumi web server sample in Google Cloud.

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Configure the project:

    ```
    $ pulumi config set gcp:project YOURGOOGLECLOUDPROJECT
    $ pulumi config set gcp:zone us-central1-a
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up -y
    Previewing update (dev):
        Type                     Name                  Plan       Info
    +   pulumi:pulumi:Stack      gcp-py-webserver-dev  create
    +   ├─ gcp:compute:Address   address               create
    +   ├─ gcp:compute:Network   network               create
    +   ├─ gcp:compute:Firewall  firewall              create
    +   └─ gcp:compute:Instance  instance              create

    Updating (dev):
        Type                     Name                  Status      Info
    +   pulumi:pulumi:Stack      gcp-py-webserver-dev  created
    +   ├─ gcp:compute:Address   address               created
    +   ├─ gcp:compute:Network   network               created
    +   ├─ gcp:compute:Firewall  firewall              created
    +   └─ gcp:compute:Instance  instance              created

    Outputs:
        instanceIP  : "35.188.118.61"
        instanceName: "instance-91b70e1"

    Resources:
        + 5 created

    Duration: 1m51s
    ```

1.  Curl the HTTP server:

    ```
    $ curl $(pulumi stack output instanceIP)
    Hello, World!
    ```

1.  SSH into the server:

    ```
    $ gcloud compute ssh $(pulumi stack output instanceName)
    Warning: Permanently added 'compute.967481934451185713' (ECDSA) to the list of known hosts.

    The programs included with the Debian GNU/Linux system are free software;
    the exact distribution terms for each program are described in the
    individual files in /usr/share/doc/*/copyright.

    Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
    permitted by applicable law.
    user@instance-8ad9bd8:~$
    ```

1. Cleanup

    ```
    $ pulumi destroy
    $ pulumi stack rm
    ```
