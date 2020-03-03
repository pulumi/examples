[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Host a Static Website on Amazon S3

A static website that uses [S3's website support](https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html).
For a detailed walkthrough of this example, see the tutorial [Static Website on AWS S3](https://www.pulumi.com/docs/tutorials/aws/s3-website/).

## Deploying and running the program

1. Restore your Go dependencies. This example currently uses [Dep](https://github.com/golang/dep) to do so:

    ```bash
    $ dep ensure
    ```

1.  Create a new stack:

    ```bash
    $ pulumi stack init website-testing
    ```

1. Install the Pulumi AWS plugin:

    ```
    $ pulumi plugin install resource aws 0.18.3
    ```

1.  Set the AWS region:

    ```
    $ pulumi config set aws:region us-west-2
    ```

1.  Compile the Go program and ensure it's on your path (such as with `$GOPATH`):

    ```
    $ go get .
    $ go install .
    ```

1.  Run `pulumi up` to preview and deploy changes.

    ```bash
    $ pulumi up
    Previewing stack 'website-testing'
    Previewing changes:
    ...

    Performing changes:

    #: Resource Type        Name                              Status     Extra Inf
    1: pulumi:pulumi:Stack  aws-js-s3-folder-website-testing  + created  
    2: aws:s3:Bucket        s3-website-bucket                 + created  
    3: aws:s3:BucketPolicy  bucketPolicy                      + created  
    4: aws:s3:BucketObject  favicon.png                       + created  
    5: aws:s3:BucketObject  index.html                        + created  

    info: 5 changes performed:
        + 5 resources created
    Update duration: 8.827698762s

    Permalink: https://pulumi.com/lindydonna/examples/aws-js-s3-folder/website-testing/updates/1
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
        pulumi:pulumi:Stack                              aws-go-s3-folder-go-website-testing
        aws:s3/bucket:Bucket                             s3-website-bucket
        aws:s3/bucketPolicy:BucketPolicy                 bucketPolicy
        aws:s3/bucketObject:BucketObject                 www/index.html
        aws:s3/bucketObject:BucketObject                 www/favicon.png
    ```

1.  To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
