# Static Website Hosted on AWS S3 in Go

A static website that uses [S3's website support](https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html).
For a detailed walkthrough of this example, see the tutorial [Static Website on AWS S3](https://pulumi.io/quickstart/aws-s3-website.html).

## Deploying and running the program

1.  Create a new stack:

    ```bash
    $ pulumi stack init website-testing
    ```

2.  Set the AWS region:

    ```
    $ pulumi config set aws:region us-west-2
    ```

3.  Compile the Go program and ensure it's on your path (such as with `$GOPATH`):

    ```
    $ go get .
    $ go install .
    ```

4.  Run `pulumi update` to preview and deploy changes.

    ```bash
    $ pulumi update
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

5.  To see the resources that were created, run `pulumi stack`:

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

6.  To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
