[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-native-java-s3-folder/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-native-java-s3-folder/README.md#gh-dark-mode-only)

# Host a Static Website on Amazon S3 with the AWS Native Provider

A static website that uses [S3's website support](https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html).
For a detailed walkthrough of this example, see the tutorial [Static Website on AWS S3](https://www.pulumi.com/docs/tutorials/aws/s3-website/).

Note: Some resources are not yet supported by the Native AWS provider, so we are using both the Native
and Classic provider in this example. The resources will be updated to use native resources as they are
available in AWS's Cloud Control API.

## Deploying and running the program

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1.  Set the AWS region:

    Either using an environment variable
    ```bash
    $ export AWS_REGION=us-west-2
    ```

    Or with the stack config
    ```bash
    $ pulumi config set aws:region us-west-2
    $ pulumi config set aws-native:region us-west-2
    ```

1.  Run `pulumi up` to preview and deploy changes.  After the preview is shown you will be
    prompted if you want to continue or not.

    ```bash
    $ pulumi up
    Previewing update (dev)

    View Live: https://app.pulumi.com/***/aws-java-s3-folder/dev/previews/e251093a-d128-4ed3-a230-4e98888aed84

         Type                     Name                    Plan       Info
     +   pulumi:pulumi:Stack      aws-java-s3-folder-dev  create     6 messages
     +   ├─ aws-native:s3:Bucket  s3-website-bucket       create
     +   ├─ aws:s3:BucketPolicy   bucketPolicy            create
     +   ├─ aws:s3:BucketObject   index.html              create
     +   └─ aws:s3:BucketObject   favicon.ico             create

    Diagnostics:
      pulumi:pulumi:Stack (aws-java-s3-folder-dev):
        > Task :app:compileJava UP-TO-DATE
        > Task :app:processResources NO-SOURCE
        > Task :app:classes UP-TO-DATE
        > Task :app:run
        BUILD SUCCESSFUL in 3s
        2 actionable tasks: 1 executed, 1 up-to-date


    Updating (dev)

    View Live: https://app.pulumi.com/***/aws-java-s3-folder/dev/updates/1

         Type                     Name                    Status      Info
     +   pulumi:pulumi:Stack      aws-java-s3-folder-dev  created     6 messages
     +   ├─ aws-native:s3:Bucket  s3-website-bucket       created
     +   ├─ aws:s3:BucketPolicy   bucketPolicy            created
     +   ├─ aws:s3:BucketObject   index.html              created
     +   └─ aws:s3:BucketObject   favicon.ico             created

    Diagnostics:
      pulumi:pulumi:Stack (aws-java-s3-folder-dev):
        > Task :app:compileJava UP-TO-DATE
        > Task :app:processResources NO-SOURCE
        > Task :app:classes UP-TO-DATE
        > Task :app:run
        BUILD SUCCESSFUL in 1m 5s
        2 actionable tasks: 1 executed, 1 up-to-date

    Outputs:
        bucketName: "s3-website-bucket-***"
        urn       : "***"
        websiteUrl: "http://s3-website-bucket-***.s3-website-us-west-2.amazonaws.com"

    Resources:
        + 5 created

    Duration: 1m6s
    ```

1.  To see the resources that were created, run `pulumi stack output`:

    ```bash
    $ pulumi stack output
    Current stack outputs (3):
        OUTPUT      VALUE
        bucketName  s3-website-bucket-***
        urn         urn:pulumi:dev::aws-java-s3-folder::pulumi:pulumi:Stack::aws-java-s3-folder-dev
        websiteUrl  http://s3-website-bucket-***.s3-website-us-west-2.amazonaws.com
    ```

1.  To see that the S3 objects exist, you can either use the AWS Console or the AWS CLI:

    ```bash
    $ aws s3 ls $(pulumi stack output bucketName)
    2022-02-17 14:11:54      13731 favicon.ico
    2022-02-17 14:11:54        198 index.html
    ```

1.  Open the site URL in a browser to see both the rendered HTML and the favicon:

    ```bash
    $ pulumi stack output websiteUrl
    http://s3-website-bucket-***.s3-website-us-west-2.amazonaws.com
    ```

    ![Hello S3 example](https://user-images.githubusercontent.com/274700/116912066-9384e300-abfc-11eb-8130-dbcff512a9de.png)

1.  To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
