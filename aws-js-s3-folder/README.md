# Static Website Hosted on AWS S3

A static website that uses [S3's website support](https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html). For a detailed walkthrough of this example, see [Part 2 of the Pulumi quickstart](https://docs.pulumi.com/quickstart/part2.html).

## Deploying and running the program

1.  Initialize a Pulumi repository with `pulumi init`, using your GitHub username. (Note: this step will be removed in the future.)

    ```bash
    $ pulumi init --owner githubUsername
    ```

1.  Create a new stack:

    ```bash
    $ pulumi stack init website-testing`
    ```

1.  Set the AWS region:

    ```
    $ pulumi config set aws:region us-west-2
    ```

1.  Restore NPM modules via `npm install`.

1.  Run `pulumi preview` to see what AWS resources will be created:

    ```bash
    $ pulumi preview
    Previewing stack 'testing' in the Pulumi Cloud ☁️
    Previewing changes:

    pulumi:Stack("aws-js-s3-folder-testing"): Completed
    aws:Bucket("s3-website-bucket"):          + Would create
    aws:BucketPolicy("bucketPolicy"):         + Would create
    aws:BucketObject("favicon.png"):          + Would create
    aws:BucketObject("index.html"):           + Would create
    info: 5 changes previewed:
        + 5 resources to create    
    ```

1.  Now, provision resources via `pulumi update`:

    ```bash
    $ pulumi update
    Updating stack 'testing' in the Pulumi Cloud ☁️
    Performing changes:

    pulumi:Stack("aws-js-s3-folder-testing"): Completed
    aws:Bucket("s3-website-bucket"):          + Created
    aws:BucketPolicy("bucketPolicy"):         + Created
    aws:BucketObject("favicon.png"):          + Created
    aws:BucketObject("index.html"):           + Created
    info: 5 changes performed:
        + 5 resources created
    Update duration: 7.083525991s

    Permalink: https://pulumi.com/lindydonna/examples/aws-js-s3-folder/testing/updates/9
    ```

1.  To see the resources that were created, run `pulumi stack output`:

    ```bash
    $ pulumi stack output
    Current stack outputs (2):
        OUTPUT                                           VALUE
        bucketName                                       s3-website-bucket-e7c0411
        websiteUrl                                       s3-website-bucket-e7c0411.s3-website-us-west-2.amazonaws.com
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
    s3-website-bucket-8533d8b.s3-website-us-west-2.amazonaws.com
    ```

    ![Hello S3 example](images/part2-website.png)



