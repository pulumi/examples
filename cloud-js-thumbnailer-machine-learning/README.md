[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Video Thumbnailer with AWS Rekognition

A video thumbnail extractor using serverless functions, containers, and [AWS Rekognition](https://aws.amazon.com/rekognition/). This is an extension of the sample [cloud-js-thumbnailer](../cloud-js-thumbnailer). When a new video is uploaded to S3, this sample calls AWS Rekognition to find a frame with the highest confidence for the label "cat" and extracts a jpg of this frame, by running ffmpeg in an AWS Fargate container.

![When a new video is uploaded, extract a thumbnail using AWS Rekognition](thumbnailer-rekognition-diagram.png)

## Prerequisites

To use this example, make sure [Docker](https://docs.docker.com/engine/installation/) is installed and running.

## Running the App

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1.  Create a new stack:

    ```
    $ pulumi stack init thumbnailer-rekognition
    ```

1.  Configure Pulumi to use AWS Fargate, which is currently only available in `us-east-1`, `us-west-2`, and `eu-west-1`:

    ```
    $ pulumi config set aws:region us-west-2
    $ pulumi config set cloud-aws:useFargate true
    ```

1.  Configure the Lambda function role so that it can access Rekognition:

    ```
    $ pulumi config set cloud-aws:computeIAMRolePolicyARNs arn:aws:iam::aws:policy/AWSLambdaFullAccess,arn:aws:iam::aws:policy/AmazonEC2ContainerServiceFullAccess,arn:aws:iam::aws:policy/AmazonRekognitionFullAccess
    ```

1.  Restore NPM modules via `npm install` or `yarn install`.

1.  Preview and deploy the app via `pulumi up`. The preview will take some time, as it builds a Docker container. A total of 48 resources are created.

    ```
    $ pulumi up
    Previewing update of stack 'thumbnailer-rekognition'
    ...

    Performing changes:

        Type                                Name                                                         Status        Info
    *   global                                    global                                                 unchanged     1 info message. info: Building container image 'p
    +   pulumi:pulumi:Stack                       video-thumbnailer-rekognition                          created       1 info message. info: 88888b9b1b5b: Pushed
    +   ├─ awsx:network:Network              default-vpc                                            created
    +   ├─ awsx:network:Network              default-vpc                                            created
    +   ├─ cloud:global:infrastructure            global-infrastructure                                  created
    +   ├─ cloud:global:infrastructure            global-infrastructure                                  created
    +   │  ├─ aws:iam:Role                        pulumi-donna-t-execution                               created
    +   ├─ cloud:global:infrastructure            global-infrastructure                                  created
    +   ├─ cloud:global:infrastructure            global-infrastructure                                  created
    +   ├─ cloud:global:infrastructure            global-infrastructure                                  created
    +   ├─ cloud:bucket:Bucket                    bucket                                                 created
    +   │  ├─ cloud:function:Function             onNewVideo                                             created
    +   │  │  └─ aws:serverless:Function          onNewVideo                                             created
    +   │  │  └─ aws:serverless:Function          onNewVideo                                             created
    +   │  │  └─ aws:serverless:Function          onNewVideo                                             created
    +   │  │  └─ aws:serverless:Function          onNewVideo                                             created
    +   │  │  └─ aws:serverless:Function          onNewVideo                                             created
    +   │  ├─ cloud:function:Function             onNewThumbnail                                         created
    +   │  │  └─ aws:serverless:Function          onNewThumbnail                                         created
    +   │  │  └─ aws:serverless:Function          onNewThumbnail                                         created
    +   │  │     ├─ aws:iam:RolePolicyAttachment  onNewThumbnail-32be53a2                                created
    +   │  │     ├─ aws:iam:RolePolicyAttachment  onNewThumbnail-fd1a00e5                                created
    +   │  │     └─ aws:lambda:Function           onNewThumbnail                                         created
    +   │  ├─ aws:s3:Bucket                       bucket                                                 created
    +   │  ├─ aws:lambda:Permission               onNewVideo                                             created
    +   │  ├─ aws:lambda:Permission               onNewThumbnail                                         created
    +   │  └─ aws:s3:BucketNotification           bucket                                                 created
    +   ├─ cloud:topic:Topic                      AmazonRekognitionTopic                                 created
    +   │  └─ aws:sns:Topic                       AmazonRekognitionTopic                                 created
    +   ├─ aws:iam:Role                           rekognition-role                                       created
    +   ├─ cloud:function:Function                AmazonRekognitionTopic_labelResults                    created
    +   │  └─ aws:serverless:Function             AmazonRekognitionTopic_labelResults                    created
    +   │     ├─ aws:iam:Role                     AmazonRekognitionTopic_labelResults                    created
    +   │     ├─ aws:iam:RolePolicyAttachment     AmazonRekognitionTopic_labelResults-32be53a2           created
    +   │     ├─ aws:iam:RolePolicyAttachment     AmazonRekognitionTopic_labelResults-fd1a00e5           created
    +   │     └─ aws:lambda:Function              AmazonRekognitionTopic_labelResults                    created
    +   ├─ cloud:task:Task                        ffmpegThumbTask                                        created
    +   │  ├─ aws:cloudwatch:LogGroup             ffmpegThumbTask                                        created
    +   │  └─ aws:ecs:TaskDefinition              ffmpegThumbTask                                        created
    +   ├─ awsx:cluster:Cluster              pulumi-donna-thum-global                               created
    +   │  ├─ aws:ecs:Cluster                     pulumi-donna-thum-global                               created
    +   │  └─ aws:ec2:SecurityGroup               pulumi-donna-thum-global                               created
    +   ├─ aws:iam:RolePolicyAttachment           rekognition-access                                     created
    +   ├─ aws:lambda:Permission                  AmazonRekognitionTopic_labelResults                    created
    +   └─ aws:sns:TopicSubscription              AmazonRekognitionTopic_labelResults                    created

    ...
    info: 44 changes performed:
        + 44 resources created
    Update duration: ***

    Permalink: https://app.pulumi.com/***
    ```

1.  Upload a video:

    ```
    $ aws s3 cp ./sample/cat.mp4 s3://$(pulumi stack output bucketName)
    upload: sample/cat.mp4 to s3://***/cat.mp4
    ```

1.  View the logs from both the Lambda function and the ECS task:

    ```
    $ pulumi logs -f
    Collecting logs for stack pulumi/donna-thumbnailer-rekognition since 2018-05-21T18:57:11.000-07:00.
    2018-05-21T19:57:35.968-07:00[                    onNewVideo] *** New video: file cat.mp4 was uploaded at 2018-05-22T02:57:35.431Z.
    2018-05-21T19:57:36.376-07:00[                    onNewVideo] *** Submitted Rekognition job for cat.mp4
    2018-05-21T19:57:45.848-07:00[AmazonRekognitionTopic_labelRe] *** Rekognition job complete
    2018-05-21T19:57:50.690-07:00[AmazonRekognitionTopic_labelRe] Raw label results:
    ...
    2018-05-21T19:57:50.746-07:00[AmazonRekognitionTopic_labelRe]     *** Found object Cat at position 1568.  Confidence = 50.56669616699219
    2018-05-21T19:57:50.746-07:00[AmazonRekognitionTopic_labelRe] *** Rekognition processing complete for bucket-d6c6339/cat.mp4 at timestamp 1.568
    2018-05-21T19:57:51.762-07:00[AmazonRekognitionTopic_labelRe] *** Launched thumbnailer task.
    2018-05-21T19:58:55.197-07:00[               ffmpegThumbTask] Starting ffmpeg task...
    2018-05-21T19:58:55.216-07:00[               ffmpegThumbTask] Copying from S3 bucket-d6c6339/cat.mp4 to cat.mp4 ...
    download: s3://bucket-d6c6339/cat.mp4 to ./cat.mp4                pleted 256.0 KiB/756.1 KiB (2.4 MiB/s) with 1 file(s) remaining
    2018-05-21T19:59:02.244-07:00[               ffmpegThumbTask] Copying .jpg to S3 at bucket-d6c6339/.jpg ...
    upload: ./.jpg to s3://bucket-d6c6339/output/.jpg                 pleted 87.3 KiB/87.3 KiB (428.8 KiB/s) with 1 file(s) remaining
    2018-05-21T19:59:05.778-07:00[                onNewThumbnail] *** New thumbnail: file cat.jpg was saved at 2018-05-22T02:59:04.858Z.
        ```

1.  Download the key frame:

    ```
    $ aws s3 cp s3://$(pulumi stack output bucketName)/cat.jpg .
    download: s3://***/cat.jpg to ./cat.jpg
    ```

## Clean up

To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
