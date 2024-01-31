[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-secrets-manager/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-secrets-manager/README.md#gh-dark-mode-only)

# Setup AWS Secrets manager

A simple program that creates an AWS secret and a version under AWS Secrets Manager

## Deploying and running the program

1.  Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1.  Set the AWS region:

    ```
    $ pulumi config set aws:region us-east-1
    ```

1.  Run `pulumi up` to preview and deploy changes:

    ```
    $ pulumi up
    Previewing update (dev)
    ...

    Updating (dev)

    View Live: https://app.pulumi.com/acmecorp/aws-go-secrets-manager/dev/updates/1

        Type                                 Name                        Status
    +   pulumi:pulumi:Stack                  aws-go-secrets-manager-dev  created
    +   ├─ aws:secretsmanager:Secret         secretcontainer             created
    +   └─ aws:secretsmanager:SecretVersion  secret                      created

    Outputs:
        secretContainer: "arn:aws:secretsmanager:us-east-1:xxxxxxxx:secret:secretcontainer-562188f-67Rt8n"

    Resources:
        + 3 created

    Duration: 11s
    ```

## Clean up

1.  Run `pulumi destroy` to tear down all resources.

1.  To delete the stack itself, run `pulumi stack rm`. Note that this command deletes all deployment history from the Pulumi console.
