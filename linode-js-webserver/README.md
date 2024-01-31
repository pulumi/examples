[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/linode-js-webserver/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/linode-js-webserver/README.md#gh-dark-mode-only)

# Web Server on Linode

Starting point for building a Pulumi sample webserver on Linode.

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init webserver-linode-testing
    ```

1.  Configure the project:

    ```
    $ pulumi config set --secret linode:token YOURLINODETOKEN
    ```

1.  Restore NPM dependencies:

    ```
    $ npm install
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing update (webserver-linode-testing):
    ...

    Updating (webserver-linode-testing):

        Type                         Name                                        Status
    +   pulumi:pulumi:Stack          webserver-linode-webserver-linode-testing   created
    +   ├─ linode:index:StackScript  simple-server                               created
    +   └─ linode:index:Instance     instance                                    created

    Outputs:
        instanceIP   : "69.164.221.90"
        instanceLabel: "linode13879908"

    Resources:
        + 3 created

    Duration: 55s
    ```

1.  Curl the HTTP server:

    ```
    $ curl $(pulumi stack output instanceIP)
    Hello, World!
    ```

1.  SSH into the server:

    ```
    $ linode-cli ssh root@$(pulumi stack output instanceLabel)
    Warning: Permanently added '69.164.221.90' (ECDSA) to the list of known hosts.
    Linux li136-90 4.9.0-9-amd64 #1 SMP Debian 4.9.168-1 (2019-04-12) x86_64

    The programs included with the Debian GNU/Linux system are free software;
    the exact distribution terms for each program are described in the
    individual files in /usr/share/doc/*/copyright.

    Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
    permitted by applicable law.
    root@li136-90:~#
    ```

1. Cleanup

    ```
    $ pulumi destroy
    $ pulumi stack rm
    ```
