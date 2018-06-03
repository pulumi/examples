# Static Website Hosted on AWS S3 in Go

A static website that uses [S3's website support](https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html).
For a detailed walkthrough of this example, see
[Part 2 of the Pulumi quickstart](https://docs.pulumi.com/quickstart/part2.html).

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

5.  To see the resources that were created, run `pulumi stack output`:

    ```bash
    $ pulumi stack output
    Current stack outputs (2):
        OUTPUT                                           VALUE
        bucketName                                       s3-website-bucket-e7c0411
        websiteUrl                                       s3-website-bucket-e7c0411.s3-website-us-west-2.amazonaws.com
    ```

6.  To see that the S3 objects exist, you can either use the AWS Console or the AWS CLI:

    ```bash
    $ aws s3 ls $(pulumi stack output bucketName)
    2018-04-17 15:40:47      13731 favicon.png
    2018-04-17 15:40:48        249 index.html
    ```

7.  Open the site URL in a browser to see both the rendered HTML and the favicon:

    ```bash
    $ pulumi stack output websiteUrl
    s3-website-bucket-8533d8b.s3-website-us-west-2.amazonaws.com
    ```

    ![Hello S3 example](images/part2-website.png)

8.  To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
