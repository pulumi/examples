[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-py-instance-nginx/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/gcp-py-instance-nginx/README.md#gh-dark-mode-only)

# Nginx Server Using Compute Engine

Starting point for building the Pulumi nginx server sample in Google Cloud Platform.
This example deploys two GCP virtual machines:

- a virtual machine running nginx via a [startup script](https://cloud.google.com/compute/docs/startupscript)
- a virtual machine running nginx via a Docker container with Google's
[Container-Optimized OS](https://cloud.google.com/container-optimized-os/docs)

## Running the App

1. Create a new stack:

    ```bash
    $ pulumi stack init gcp-instance-nginx
    ```

1. Configure the project:

    ```bash
    $ export GOOGLE_PROJECT=YOURPROJECTID; export GOOGLE_REGION=asia-east1; export GOOGLE_ZONE=asia-east1-a;
    $ export GOOGLE_CREDENTIALS=YOURGCPCREDENTIALS
    ```

1. Run `pulumi up` to preview and deploy changes:

    ```bash
    $ pulumi up
    Previewing update (dev):
        Type                     Name                    Plan
    +   pulumi:pulumi:Stack      gcp-instance-nginx-dev  create
    +   ├─ gcp:compute:Address   poc                     create
    +   ├─ gcp:compute:Network   poc                     create
    +   ├─ gcp:compute:Address   poc-container-instance  create
    +   ├─ gcp:compute:Firewall  poc                     create
    +   ├─ gcp:compute:Instance  poc                     create
    +   └─ gcp:compute:Instance  poc-container-instance  create

    Resources:
        + 7 to create

    Do you want to perform this update? yes
    Updating (dev):
        Type                     Name                    Status
    +   pulumi:pulumi:Stack      gcp-instance-nginx-dev  created
    +   ├─ gcp:compute:Address   poc                     created
    +   ├─ gcp:compute:Network   poc                     created
    +   ├─ gcp:compute:Address   poc-container-instance  created
    +   ├─ gcp:compute:Firewall  poc                     created
    +   ├─ gcp:compute:Instance  poc                     created
    +   └─ gcp:compute:Instance  poc-container-instance  created

    Outputs:
        container_instance_external_ip: "34.66.98.237"
        container_instance_name       : "poc-container-instance-11dddc1"
        instance_external_ip          : "35.192.222.243"
        instance_name                 : "poc-4897b20"

    Resources:
        + 7 created

    Duration: 59s
    ```

1. Curl the HTTP server:

    ```bash
    $ curl $(pulumi stack output instance_external_ip)
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">

    <html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
        <head>
            <title>Test Page for the Nginx HTTP Server on Fedora</title>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
            <style type="text/css">
                /*<![CDATA[*/
                body {
                    background-color: #fff;
                    color: #000;
                    font-size: 0.9em;
                    font-family: sans-serif,helvetica;
                    margin: 0;
                    padding: 0;
                }
                :link {
                    color: #c00;
                }
                :visited {
                    color: #c00;
                }
                a:hover {
                    color: #f50;
                }
                h1 {
                    text-align: center;
                    margin: 0;
                    padding: 0.6em 2em 0.4em;
                    background-color: #294172;
                    color: #fff;
                    font-weight: normal;
                    font-size: 1.75em;
                    border-bottom: 2px solid #000;
                }
                h1 strong {
                    font-weight: bold;
                    font-size: 1.5em;
                }
                h2 {
                    text-align: center;
                    background-color: #3C6EB4;
                    font-size: 1.1em;
                    font-weight: bold;
                    color: #fff;
                    margin: 0;
                    padding: 0.5em;
                    border-bottom: 2px solid #294172;
                }
                hr {
                    display: none;
                }
                .content {
                    padding: 1em 5em;
                }
                .alert {
                    border: 2px solid #000;
                }

                img {
                    border: 2px solid #fff;
                    padding: 2px;
                    margin: 2px;
                }
                a:hover img {
                    border: 2px solid #294172;
                }
                .logos {
                    margin: 1em;
                    text-align: center;
                }
                /*]]>*/
            </style>
        </head>

        <body>
            <h1>Welcome to <strong>nginx</strong> on Fedora!</h1>

            <div class="content">
                <p>This page is used to test the proper operation of the
                <strong>nginx</strong> HTTP server after it has been
                installed. If you can read this page, it means that the
                web server installed at this site is working
                properly.</p>

                <div class="alert">
                    <h2>Website Administrator</h2>
                    <div class="content">
                        <p>This is the default <tt>index.html</tt> page that
                        is distributed with <strong>nginx</strong> on
                        Fedora.  It is located in
                        <tt>/usr/share/nginx/html</tt>.</p>

                        <p>You should now put your content in a location of
                        your choice and edit the <tt>root</tt> configuration
                        directive in the <strong>nginx</strong>
                        configuration file
                        <tt>/etc/nginx/nginx.conf</tt>.</p>

                    </div>
                </div>

                <div class="logos">
                    <a href="http://nginx.net/"><img
                        src="nginx-logo.png"
                        alt="[ Powered by nginx ]"
                        width="121" height="32" /></a>

                    <a href="http://fedoraproject.org/"><img
                        src="poweredby.png"
                        alt="[ Powered by Fedora ]"
                        width="88" height="31" /></a>
                </div>
            </div>
        </body>
    </html>
    ```

1. Destroy the created resources:

    ```bash
    $ pulumi destroy
    Previewing destroy (dev):
        Type                     Name                    Plan
    -   pulumi:pulumi:Stack      gcp-instance-nginx-dev  delete
    -   ├─ gcp:compute:Firewall  poc                     delete
    -   ├─ gcp:compute:Instance  poc                     delete
    -   ├─ gcp:compute:Instance  poc-container-instance  delete
    -   ├─ gcp:compute:Address   poc-container-instance  delete
    -   ├─ gcp:compute:Network   poc                     delete
    -   └─ gcp:compute:Address   poc                     delete

    Outputs:
    - container_instance_external_ip: "34.66.98.237"
    - container_instance_name       : "poc-container-instance-11dddc1"
    - instance_external_ip          : "35.192.222.243"
    - instance_name                 : "poc-4897b20"

    Resources:
        - 7 to delete

    Do you want to perform this destroy? yes
    Destroying (dev):
        Type                     Name                    Status
    -   pulumi:pulumi:Stack      gcp-instance-nginx-dev  deleted
    -   ├─ gcp:compute:Firewall  poc                     deleted
    -   ├─ gcp:compute:Instance  poc                     deleted
    -   ├─ gcp:compute:Instance  poc-container-instance  deleted
    -   ├─ gcp:compute:Network   poc                     deleted
    -   ├─ gcp:compute:Address   poc-container-instance  deleted
    -   └─ gcp:compute:Address   poc                     deleted

    Outputs:
    - container_instance_external_ip: "34.66.98.237"
    - container_instance_name       : "poc-container-instance-11dddc1"
    - instance_external_ip          : "35.192.222.243"
    - instance_name                 : "poc-4897b20"

    Resources:
        - 7 deleted

    Duration: 3m9s
    ```

1. Destroy the stack:

    ```bash
    $ pulumi stack rm
    This will permanently remove the 'gcp-instance-nginx' stack!
    Please confirm that this is what you'd like to do by typing ("gcp-instance-nginx"): gcp-instance-nginx
    Stack 'gcp-instance-nginx' has been removed!
    ```
