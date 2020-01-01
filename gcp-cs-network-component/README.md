[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Google Cloud Network and Instance with ComponentResource

This example uses `pulumi.ComponentResource` as described [here](https://www.pulumi.com/docs/intro/concepts/programming-model/#components) 
to create a Google Cloud Network and instance.

The use of `pulumi.ComponentResource` demonstrates how multiple low-level resources 
can be composed into a higher-level, reusable abstraction.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure Pulumi for Google Cloud](https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/)
1. [Configure Pulumi for dotnet](https://www.pulumi.com/docs/intro/languages/dotnet/)

## Deploying and running the program

1. Create a new stack:

    ```
    $ pulumi stack init
    ```

1. Set the Google Cloud project and region

    ```
    $ pulumi config set gcp:project proj-123456
    $ pulumi config set gcp:region us-central1
    $ pulumi config set gcp:zone us-central1-a
    ```

1. Run `pulumi up` to preview and deploy the changes:

    ```
    $ pulumi up -y
    
    Please choose a stack, or create a new one: dev
    Previewing update (dev):
        Type                 Name            Plan     Info
        pulumi:pulumi:Stack  gcp-csharp-dev           'dotnet build -nologo .' completed successfully

        Type                     Name            Plan
    +   pulumi:pulumi:Stack      gcp-csharp-dev  create
    +   ├─ gcp:compute:Address   test            create
    +   ├─ gcp:compute:Network   test            create
    +   ├─ gcp:compute:Instance  test            create
    +   └─ gcp:compute:Firewall  test            create

    Resources:
        + 5 to create

    Updating (dev):
        Type                 Name            Status     Info
        pulumi:pulumi:Stack  gcp-csharp-dev             'dotnet build -nologo .' completed successfully

        Type                     Name            Status
    +   pulumi:pulumi:Stack      gcp-csharp-dev  created
    +   ├─ gcp:compute:Address   test            created
    +   ├─ gcp:compute:Network   test            created
    +   ├─ gcp:compute:Instance  test            created
    +   └─ gcp:compute:Firewall  test            created

    Outputs:
        VM: "test-5bd623a"

    Resources:
        + 5 created

    Duration: 52s
     ```

    Permalink: https://app.pulumi.com/tom21tom21/gcp-csharp/dev/updates/23
    The resources in the stack have been deleted, but the history and configuration associated with the stack are still maintained.
    If you want to remove the stack completely, run 'pulumi stack rm dev'.
    ```
