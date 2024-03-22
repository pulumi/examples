[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-s3-folder/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-go-s3-folder/README.md#gh-dark-mode-only)

# Host a Static Website on Amazon S3

A static website that uses [S3's website support](https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html).
For a detailed walkthrough of this example, see the tutorial [Static Website on AWS S3](https://www.pulumi.com/docs/tutorials/aws/s3-website/).

## Deploying and running the program

1.  Create a new stack:

    ```bash
    $ pulumi stack init website-testing
    ```

1.  Set the AWS region:

    ```
    $ pulumi config set aws:region us-west-2
    ```

1.  Run `pulumi up` to preview and deploy changes.

    ```bash
    $ pulumi up
    Previewing stack 'website-testing'
    Previewing changes:
    ...

    Performing changes:

    #: Resource Type        Name                              Status     Extra Inf
    1: pulumi:pulumi:Stack  website-testing  + created
    2: aws:s3:Bucket        s3-website-bucket                 + created
    3: aws:s3:BucketPolicy  bucketPolicy                      + created
    4: aws:s3:BucketObject  favicon.png                       + created
    5: aws:s3:BucketObject  index.html                        + created

    info: 5 changes performed:
        + 5 resources created
    Update duration: 8.827698762s
    ```

1.  To see the resources that were created, run `pulumi stack`:

    ```bash
    $ pulumi stack
    Current stack is go-website-testing:
        Managed by https://api.pulumi.com
        Owner: swgillespie
        Last updated: 13 minutes ago (2018-06-15 14:19:06.856631155 -0700 PDT)
        Pulumi version: v0.14.0-rc1
        Plugin go [language] version: 0.14.0-rc1
        Plugin aws [resource] version: 0.14.0-rc1

    Current stack resources (5):
        TYPE                                             NAME
        pulumi:pulumi:Stack                              website-testing
        aws:s3/bucket:Bucket                             s3-website-bucket
        aws:s3/bucketPolicy:BucketPolicy                 bucketPolicy
        aws:s3/bucketObject:BucketObject                 www/index.html
        aws:s3/bucketObject:BucketObject                 www/favicon.png
    ```

1.  To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
