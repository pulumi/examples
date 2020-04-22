[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# GCP Instance

Create a GCP instance using Pulumi + Go.

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init gcp-instance
    ```

1.  Configure the project:

    ```
    $ pulumi config set gcp:project YOURGOOGLECLOUDPROJECT
    $ pulumi config set gcp:zone us-central1-a
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ``` 
    $ pulumi up
    Previewing update (gcp-instance):
    ...

    Updating (gcp-instance):
        Type                     Name       Status      
    +   pulumi:pulumi:Stack      gcp-instance  created     
    +   └─ gcp:compute:Instance  instance   created     
    
    Outputs:
        instanceName: "instance-6beb431"

    Resources:
        + 2 created

    Duration: 23s
    ```

1. Cleanup

    ```
    $ pulumi destroy
    $ pulumi stack rm
    ```
