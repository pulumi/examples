[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Nginx Server Using Compute Engine

Starting point for building the Pulumi nginx server sample in Google Cloud Platform.

## Running the App

1. Create a new stack:

    ```bash
    $ pulumi stack init gcp-instance-nginx
    ```

2. Create a Python virtualenv, activate it, and install dependencies:

    This installs the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program.


    ```bash
    $ python3 -m venv venv
    $ source venv/bin/activate
    $ pip3 install -r requirements.txt
    ```

3. Configure the project:

    ```bash
    $ export GOOGLE_PROJECT=cncf-230209; export GOOGLE_REGION=asia-east1; export GOOGLE_ZONE=asia-east1-a;
    $ export GOOGLE_CREDENTIALS=YOURGCPCREDENTIALS
    ```

4. Run `pulumi up` to preview and deploy changes:

    ```bash
    Previewing update (gcp-instance-nginx):

         Type                     Name                                   Plan
         pulumi:pulumi:Stack      gcp-instance-nginx-gcp-instance-nginx
     +   ├─ gcp:compute:Network   network                                create
     +   ├─ gcp:compute:Address   poc                                    create
     +   ├─ gcp:compute:Firewall  firewall                               create
     +   └─ gcp:compute:Instance  poc                                    create

    Resources:
        + 4 to create
        1 unchanged

    Do you want to perform this update? yes
    Updating (gcp-instance-nginx):

         Type                     Name                                   Status
         pulumi:pulumi:Stack      gcp-instance-nginx-gcp-instance-nginx
     +   ├─ gcp:compute:Network   network                                created
     +   ├─ gcp:compute:Address   poc                                    created
     +   ├─ gcp:compute:Instance  poc                                    created
     +   └─ gcp:compute:Firewall  firewall                               created

    Outputs:
      + external_ip     : "34.80.8.146"
      + instance_name   : "poc"
      + instance_network: [
      +     [0]: {
              + accessConfigs    : [
              +     [0]: {
                      + assignedNatIp      : "34.80.8.146"
                      + natIp              : "34.80.8.146"
                      + network_tier       : "PREMIUM"
                    }
                ]
              + address          : "10.140.0.2"
              + name             : "nic0"
              + network          : "https://www.googleapis.com/compute/v1/projects/cncf-230209/global/networks/network-6054c92"
              + networkIp        : "10.140.0.2"
              + subnetwork       : "https://www.googleapis.com/compute/v1/projects/cncf-230209/regions/asia-east1/subnetworks/network-6054c92"
              + subnetworkProject: "cncf-230209"
            }
        ]

    Resources:
        + 4 created
        1 unchanged

    Duration: 51s
    ```

5. Curl the HTTP server:

    ```bash
    $ curl $(pulumi stack output external_ip)
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

6. Destroy the created resources:

    ```bash
    $ pulumi destroy
    Previewing destroy (gcp-instance-nginx):

         Type                     Name                                   Plan
     -   pulumi:pulumi:Stack      gcp-instance-nginx-gcp-instance-nginx  delete
     -   ├─ gcp:compute:Instance  poc                                    delete
     -   ├─ gcp:compute:Firewall  firewall                               delete
     -   ├─ gcp:compute:Network   network                                delete
     -   └─ gcp:compute:Address   poc                                    delete

    Resources:
        - 5 to delete

    Do you want to perform this destroy? yes
    Destroying (gcp-instance-nginx):

         Type                     Name                                   Status
     -   pulumi:pulumi:Stack      gcp-instance-nginx-gcp-instance-nginx  deleted
     -   ├─ gcp:compute:Instance  poc                                    deleted
     -   ├─ gcp:compute:Firewall  firewall                               deleted
     -   ├─ gcp:compute:Network   network                                deleted
     -   └─ gcp:compute:Address   poc                                    deleted

    Resources:
        - 5 deleted

    Duration: 1m57s
    ```

7. Destroy the stack:

    ```bash
    $ pulumi stack rm
    This will permanently remove the 'gcp-instance-nginx' stack!
    Please confirm that this is what you'd like to do by typing ("gcp-instance-nginx"): gcp-instance-nginx
    Stack 'gcp-instance-nginx' has been removed!
    ```
