[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Lambd secrets

Storing stack secrets securely and accessing them in a Lambda Function

You can find a post describing the code on the [Pulumi blog](https://pulumi.com/blog/safe-lambda-secrets/).

## Running the App

1.  Create a new stack:

    ```
    pulumi stack init dev
    ```

1.  Configure Pulumi to use an AWS region of your choice, for example:

    ```
    pulumi config set aws:region us-west-2
    ```

1.  Restore NPM modules via `npm install` or `yarn install`.

1. Add values to your stack config, both secret and plaintext:

```bash
pulumi config set --path 'lambdawithsecrets.envvars["envvar1"]' envvar1value
pulumi config set --path 'lambdawithsecrets.envvars["envvar2"]' envvar2value
pulumi config set --path 'lambdawithsecrets.secrets["secret1"]' secretvalue1 --secret
pulumi config set --path 'lambdawithsecrets.secrets["secret2"]' secretvalue2 --secret
```

1.  Preview and deploy the app via `pulumi up`. 

    ```
    $ pulumi up
    Previewing update (dev)

    View Live: https://app.pulumi.com/acmecorp/lambda-secrets/dev/previews/209f07fb-190d-4596-af9f-d2d72e9c5cc9

        Type                                 Name                   Plan
    +   pulumi:pulumi:Stack                  lambda-secrets-dev     create
    +   ├─ aws:secretsmanager:Secret         secret1                create
    +   ├─ aws:secretsmanager:Secret         secret2                create
    +   ├─ aws:iam:Role                      roleLambdaWithSecrets  create
    +   ├─ aws:secretsmanager:SecretVersion  secretversion-secret2  create
    +   ├─ aws:secretsmanager:SecretVersion  secretversion-secret1  create
    +   ├─ aws:iam:Policy                    secretsPolicy          create
    +   ├─ aws:iam:RolePolicyAttachment      rpa-basic              create
    +   ├─ aws:iam:RolePolicyAttachment      rpa-secrets            create
    +   └─ aws:lambda:Function               lambdaWithSecrets      create

    Outputs:
        lambdaName: "lambdaWithSecrets-b8ac5e9"

    Resources:
        + 10 to create

    Do you want to perform this update? yes
    Updating (dev)

    View Live: https://app.pulumi.com/acmecorp/lambda-secrets/dev/updates/1

        Type                                 Name                   Status
    +   pulumi:pulumi:Stack                  lambda-secrets-dev     created
    +   ├─ aws:secretsmanager:Secret         secret1                created
    +   ├─ aws:secretsmanager:Secret         secret2                created
    +   ├─ aws:iam:Role                      roleLambdaWithSecrets  created
    +   ├─ aws:secretsmanager:SecretVersion  secretversion-secret2  created
    +   ├─ aws:secretsmanager:SecretVersion  secretversion-secret1  created
    +   ├─ aws:iam:Policy                    secretsPolicy          created
    +   ├─ aws:iam:RolePolicyAttachment      rpa-basic              created
    +   ├─ aws:lambda:Function               lambdaWithSecrets      created
    +   └─ aws:iam:RolePolicyAttachment      rpa-secrets            created

    Outputs:
        lambdaName: "lambdaWithSecrets-ca62cf8"

    Resources:
        + 10 created

    Duration: 24s
    ```

1.  Invoke the Lambda Function:

    ```
    aws lambda invoke --function-name $(pulumi stack output lambdaName) /dev/stdout
    ```

    You should see the output as the secret values you added:

    ```
    {"secret1":"secret1value","secret2":"secret2value"}
    ```

1. You can view the environment variables containing the plaintext values and the secret ARNs in the details of the Lambda Function in the AWS Console.

## Clean up

To clean up the resources, you will need to run `pulumi destroy` and answer the confirmation question at the prompt.
