[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-lambda-thumbnailer/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-lambda-thumbnailer/README.md#gh-dark-mode-only)

# Video Thumbnailer Using AWS Lambda

A video thumbnail extractor using serverless functions. The video processing function is packaged as a Docker container.

Navigate to [Running Container Images in AWS Lambda](https://www.pulumi.com/blog/aws-lambda-container-support/) for a full walkthrough.

## Prerequisites

To run this example, make sure [Docker](https://docs.docker.com/engine/installation/) is installed and running.

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

1.  Preview and deploy the app via `pulumi up`. The preview will take some time, as it builds a Docker container. A total of 16 resources are created.

    ```
    $ pulumi up
    Previewing update (dev)

    ...

    Do you want to perform this update? yes
    Updating (dev)

         Type                                  Name                          Status
    +   pulumi:pulumi:Stack                   video-thumbnailer-lambda-dev  created
    +   ├─ awsx:ecr:Repository                sampleapp                     created
    +   │  ├─ aws:ecr:Repository              sampleapp                     created
    +   │  └─ aws:ecr:LifecyclePolicy         sampleapp                     created
    +   ├─ aws:s3:Bucket                      bucket                        created
    +   │  ├─ aws:s3:BucketEventSubscription  onNewThumbnail                created
    +   │  │  └─ aws:lambda:Permission        onNewThumbnail                created
    +   │  ├─ aws:s3:BucketEventSubscription  onNewVideo                    created
    +   │  │  └─ aws:lambda:Permission        onNewVideo                    created
    +   │  └─ aws:s3:BucketNotification       onNewVideo                    created
    +   ├─ aws:iam:Role                       onNewThumbnail                created
    +   ├─ aws:iam:Role                       thumbnailerRole               created
    +   ├─ aws:lambda:Function                onNewThumbnail                created
    +   ├─ aws:iam:RolePolicyAttachment       onNewThumbnail-32be53a2       created
    +   ├─ aws:iam:RolePolicyAttachment       lambdaFullAccess              created
    +   └─ aws:lambda:Function                thumbnailer                   created

    Outputs:
        bucketName: "bucket-7c6b55a"

    Resources:
        + 16 created

    Duration: 1m41s
    ```

1.  View the stack outputs:

    ```
    $ pulumi stack output
    Current stack outputs (1):
        OUTPUT                                           VALUE
        bucketName                                       bucket-7c6b55a
    ```

1.  Upload a video, embedding the timestamp in the filename:

    ```
    $ aws s3 cp ./sample/cat.mp4 s3://$(pulumi stack output bucketName)/cat_00-01.mp4
    upload: sample/cat.mp4 to s3://***/cat_00-01.mp4
    ```

1.  View the logs from both Lambda functions:

    ```
    $ pulumi logs -f
    Collecting logs for stack dev since 2020-12-02T08:58:43.000+01:00.

    2020-12-02T09:58:39.747+01:00[           thumbnailer-dbb2a35] START RequestId: 3ec2886e-e739-4764-be3b-a8e5a48a4986 Version: $LATEST
    2020-12-02T09:58:39.750+01:00[           thumbnailer-dbb2a35] 2020-12-02T08:58:39.748Z	3ec2886e-e739-4764-be3b-a8e5a48a4986	INFO	Video handler called
    2020-12-02T09:58:39.750+01:00[           thumbnailer-dbb2a35] 2020-12-02T08:58:39.750Z	3ec2886e-e739-4764-be3b-a8e5a48a4986	INFO	aws s3 cp s3://bucket-33b87c2/cat_00-01.mp4 /tmp/cat_00-01.mp4
    download: s3://bucket-33b87c2/cat_00-01.mp4 to ../../tmp/cat_00-01.mp4ed 256.0 KiB/666.5 KiB (1.2 MiB/s) with 1 file(s) remaining
    2020-12-02T09:58:53.068+01:00[           thumbnailer-dbb2a35] 2020-12-02T08:58:53.068Z	3ec2886e-e739-4764-be3b-a8e5a48a4986	INFO	ffmpeg -v error -i /tmp/cat_00-01.mp4 -ss 00:01 -vframes 1 -f image2 -an -y /tmp/cat.jpg
    2020-12-02T09:59:01.701+01:00[           thumbnailer-dbb2a35] 2020-12-02T08:59:01.701Z	3ec2886e-e739-4764-be3b-a8e5a48a4986	INFO	aws s3 cp /tmp/cat.jpg s3://bucket-33b87c2/cat.jpg
    upload: ../../tmp/cat.jpg to s3://bucket-33b87c2/cat.jpg          pleted 86.6 KiB/86.6 KiB (315.8 KiB/s) with 1 file(s) remaining
    2020-12-02T09:59:11.628+01:00[           thumbnailer-dbb2a35] 2020-12-02T08:59:11.627Z	3ec2886e-e739-4764-be3b-a8e5a48a4986	INFO	*** New thumbnail: file cat_00-01.mp4 was saved at 2020-12-02T08:58:33.845Z.
    2020-12-02T09:59:11.668+01:00[           thumbnailer-dbb2a35] END RequestId: 3ec2886e-e739-4764-be3b-a8e5a48a4986
    2020-12-02T09:59:11.668+01:00[           thumbnailer-dbb2a35] REPORT RequestId: 3ec2886e-e739-4764-be3b-a8e5a48a4986	Duration: 31920.84 ms	Billed Duration: 32733 ms	Memory Size: 128 MB	Max Memory Used: 128 MB	Init Duration: 811.55 ms
    2020-12-02T09:59:11.777+01:00[        onNewThumbnail-2f969e0] START RequestId: 07c13039-eccb-4e38-a3cf-c7fa11982b84 Version: $LATEST
    2020-12-02T09:59:11.788+01:00[        onNewThumbnail-2f969e0] 2020-12-02T08:59:11.782Z	07c13039-eccb-4e38-a3cf-c7fa11982b84	INFO	onNewThumbnail called
    2020-12-02T09:59:11.788+01:00[        onNewThumbnail-2f969e0] 2020-12-02T08:59:11.788Z	07c13039-eccb-4e38-a3cf-c7fa11982b84	INFO	*** New thumbnail: file cat.jpg was saved at 2020-12-02T08:59:06.333Z.
    2020-12-02T09:59:11.809+01:00[        onNewThumbnail-2f969e0] END RequestId: 07c13039-eccb-4e38-a3cf-c7fa11982b84
    2020-12-02T09:59:11.809+01:00[        onNewThumbnail-2f969e0] REPORT RequestId: 07c13039-eccb-4e38-a3cf-c7fa11982b84	Duration: 31.96 ms	Billed Duration: 32 ms	Memory Size: 128 MB	Max Memory Used: 65 MB	Init Duration: 171.22 ms
        ```

1.  Download the key frame:

    ```
    $ aws s3 cp s3://$(pulumi stack output bucketName)/cat.jpg .
    download: s3://***/cat.jpg to ./cat.jpg
    ```

## Clean up

To clean up the resources, you will first need to clear the contents of the bucket.

```bash
aws s3 rm s3://$(pulumi stack output bucketName) --recursive
```

Then, run `pulumi destroy` and answer the confirmation question at the prompt.
