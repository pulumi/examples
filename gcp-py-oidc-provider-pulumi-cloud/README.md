# Provisioning an OIDC Provider in Google Cloud for Pulumi Cloud

This example will create OIDC configuration between Pulumi Cloud and Google Cloud, specifically demonstrating connectivity with [Pulumi ESC](https://www.pulumi.com/docs/pulumi-cloud/esc/). The program automates the process detailed in the Google Cloud documentation for the following activities:

- [Create Workload Identity Provider and Pool](https://cloud.google.com/iam/docs/workload-identity-federation-with-other-providers#create_the_workload_identity_pool_and_provider)
- [Authenticate the Workload](https://cloud.google.com/iam/docs/workload-identity-federation-with-other-providers#authenticate)

## Prerequisites

* [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
* [Configure Pulumi to Use GCP](https://www.pulumi.com/docs/clouds/gcp/get-started/begin/#configure-pulumi-to-access-your-google-cloud-account)
* [Create a Google Cloud Project](https://cloud.google.com/iam/docs/workload-identity-federation-with-other-providers#configure) with the required APIs enabled

## Running the Example

Clone [the examples repo](https://github.com/pulumi/examples/tree/master/gcp-py-oidc-provider) and navigate to the folder for this example.

```bash
git clone https://github.com/pulumi/examples.git
cd examples/gcp-py-oidc-provider-pulumi-cloud
```

Next, to deploy the application and its infrastructure, follow these steps:

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init dev
    ```

1. Set your Pulumi ESC environment name and the name of your GCP Project:

    ```bash
    pulumi config set environmentName <your-environment-name> # replace with your environment name
    pulumi config set gcp:project <your-project-name> # replace with your GCP project name
    ```

1. Install requirements.

    ```bash
    python -m venv venv
    source venv/bin/activate
    pip3 install -r requirements.txt
    deactivate
    ```

1. Run `pulumi up`. 

    ```bash
    $ pulumi up -y