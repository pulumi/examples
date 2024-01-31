[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-native-ts-stepfunctions/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-native-ts-stepfunctions/README.md#gh-dark-mode-only)

# AWS Step Functions with the AWS Native Provider

A basic example that demonstrates using AWS Step Functions with a Lambda function using the AWS Native provider.

Note: Some resources are not yet supported by the Native AWS provider, so we are using both the Native
and Classic provider in this example. The resources will be updated to use native resources as they are
available in AWS's Cloud Control API.

## Known error

On the first update, you may see the following error message:

```
error: operation CREATE failed with "InvalidRequest": The role defined for the function cannot be assumed by Lambda. (Service: Lambda, Status Code: 400, Request ID: c33fdd39-59d4-4ba8-8ad6-29f6c04d79eb, Extended Request ID: null)
```

Re-running the update should succeed. This issue is tracked [here](https://github.com/pulumi/pulumi-aws-native/issues/148)

## Deploying and running the program

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1. Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1. Set the AWS region:

    Either using an environment variable
    ```bash
    $ export AWS_REGION=us-west-2
    ```

    Or with the stack config
    ```bash
    $ pulumi config set aws:region us-west-2
    $ pulumi config set aws-native:region us-west-2
    ```

1. Restore NPM modules via `npm install` or `yarn install`.

1. Run `pulumi up` to preview and deploy changes.  After the preview is shown you will be
    prompted if you want to continue or not.

    ```bash
    $ pulumi up
    Previewing update (dev)
    ...

    Updating (dev)

    View Live: https://app.pulumi.com/***/stepfunctions/dev/updates/1

         Type                                      Name               Status
    +   pulumi:pulumi:Stack                       stepfunctions-dev  created
    +   ├─ aws:iam:Role                           sfnRole            created
    +   ├─ aws:iam:Role                           lambdaRole         created
    +   ├─ aws:iam:RolePolicy                     sfnRolePolicy      created
    +   ├─ aws:iam:RolePolicy                     lambdaRolePolicy   created
    +   ├─ aws-native:lambda:Function             helloFunction      created
    +   ├─ aws-native:lambda:Function             worldFunction      created
    +   └─ aws-native:stepfunctions:StateMachine  stateMachine       created

    Outputs:
    + stateMachineArn: "arn:aws:states:us-west-2:***:stateMachine:***"

    Resources:
    + 10 created

    Duration: ***
    ```

1. To see the resources that were created, run `pulumi stack output`:

    ```bash
    $ pulumi stack output
    Current stack outputs (1):
    OUTPUT           VALUE
    stateMachineArn  arn:aws:states:us-west-2:***:stateMachine:***
    ```

1. Start execution using the AWS CLI (or from the console at https://console.aws.amazon.com/states)

    ```bash
    $ aws stepfunctions start-sync-execution --state-machine-arn $(pulumi stack output stateMachineArn)
    ```

1.  To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
