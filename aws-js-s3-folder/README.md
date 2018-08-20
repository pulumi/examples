# Static Website Hosted on AWS S3

A static website that uses [S3's website support](https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html).
For a detailed walkthrough of this example, see the tutorial [Static Website on AWS S3](https://pulumi.io/quickstart/aws-s3-website.html).

## Deploying and running the program

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1.  Create a new stack:

    ```bash
    $ pulumi stack init website-testing
    ```

1.  Set the AWS region:

    ```
    $ pulumi config set aws:region us-west-2
    ```

1.  Restore NPM modules via `npm install` or `yarn install`.

1.  Run `pulumi up` to preview and deploy changes.  After the preview is shown you will be
    prompted if you want to continue or not.

    ```bash
    $ pulumi up
    Previewing update of stack 'website-testing'
    Previewing changes:
    ...

    Updating stack 'website-testing'
    Performing changes:

        Type                    Name                                   Status      Info
    +   pulumi:pulumi:Stack     aws-js-s3-folder-website-testing  created
    +   ├─ aws:s3:Bucket        s3-website-bucket                      created
    +   ├─ aws:s3:BucketPolicy  bucketPolicy                           created
    +   ├─ aws:s3:BucketObject  favicon.png                            created
    +   └─ aws:s3:BucketObject  index.html                             created

    info: 5 changes performed:
        + 5 resources created
    Update duration: ***

    Permalink: https://app.pulumi.com/***
    ```

1.  To see the resources that were created, run `pulumi stack output`:

    ```bash
    $ pulumi stack output
    Current stack outputs (2):
        OUTPUT                                           VALUE
        bucketName                                       s3-website-bucket-***
        websiteUrl                                       ***.s3-website-us-west-2.amazonaws.com
    ```

1.  To see that the S3 objects exist, you can either use the AWS Console or the AWS CLI:

    ```bash
    $ aws s3 ls $(pulumi stack output bucketName)
    2018-04-17 15:40:47      13731 favicon.png
    2018-04-17 15:40:48        249 index.html
    ```

1.  Open the site URL in a browser to see both the rendered HTML and the favicon:

    ```bash
    $ pulumi stack output websiteUrl
    ***.s3-website-us-west-2.amazonaws.com
    ```

    ![Hello S3 example](images/part2-website.png)

1.  To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
