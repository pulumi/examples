# Video Thumbnailer

A video thumbnail extractor using serverless functions and containers.

Loosely derived from the example at https://serverless.com/blog/serverless-application-for-long-running-process-fargate-lambda/.

## Prerequisites

To use this example, make sure [Docker](https://docs.docker.com/engine/installation/) is installed and running.

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init thumbnailer-testing
    ```

1.  Set AWS as the provider:

    ```
    $ pulumi config set cloud:provider aws
    ```

1.  Configure Pulumi to use AWS Fargate, which is currently only available in `us-east-1`, `us-west-2`, and `eu-west-1`:

    ```
    $ pulumi config set aws:region us-west-2
    $ pulumi config set cloud-aws:useFargate true
    ```    

1.  Restore NPM modules via `npm install`.

1.  Preview and deploy the app via `pulumi update`. The preview will take some time, as it builds a docker container. A total of 42 resources are created.

    ```
    Updating stack 'thumnailer-testing'
    Performing changes:

    #:  Resource Type                         Name                                  Status     Extra Info
    1:  pulumi:pulumi:Stack                   video-thumbnailer-thumnailer-testing  + created  1 info message
    2:  aws:ecs:Cluster                       pulumi-thumnailer-global              + created  
    3:  cloud:global:infrastructure           global-infrastructure                 + created  
    4:  aws:ecr:Repository                    pulum-dc8d99de-container              + created  
    5:  cloud:bucket:Bucket                   bucket                                + created  
    6:  cloud:task:Task                       ffmpegThumbTask                       + created  
    7:  aws:ec2:SecurityGroup                 pulumi-thumnailer-global              + created  
    8:  aws:sns:Topic                         pulumi-t-unhandled-error              + created  
    9:  aws:iam:Role                          pulumi-thumnailer-t-task              + created  
    10: aws:iam:Role                          pulumi-thumnai-execution              + created  
    11: cloud:logCollector:LogCollector       pulumi-thumnailer-testin              + created  
    12: cloud:function:Function               onNewVideo                            + created  
    13: cloud:function:Function               onNewThumbnail                        + created  
    14: aws:s3:Bucket                         bucket                                + created  
    15: aws:cloudwatch:LogGroup               ffmpegThumbTask                       + created  
    16: aws:iam:RolePolicyAttachment          pulumi-thu-task-32be53a2              + created  
    17: aws:iam:RolePolicyAttachment          pulumi-thu-task-fd1a00e5              + created  
    18: aws:iam:RolePolicyAttachment          pulumi-thumnai-execution              + created  
    19: aws:serverless:Function               pulumi-thumnailer-testin              + created  
    20: aws:serverless:Function               onNewVideo                            + created  
    21: aws:serverless:Function               onNewThumbnail                        + created  
    22: aws:iam:Role                          pulumi-thumnailer-testin              + created  
    23: aws:iam:Role                          onNewVideo                            + created  
    24: aws:iam:Role                          onNewThumbnail                        + created  
    25: aws:lambda:Function                   pulumi-thumnailer-testin              + created  
    26: aws:iam:RolePolicyAttachment          pulumi-thumnailer-testin-32be53a2     + created  
    27: aws:iam:RolePolicyAttachment          onNewVideo-32be53a2                   + created  
    28: aws:iam:RolePolicyAttachment          onNewVideo-fd1a00e5                   + created  
    29: aws:iam:RolePolicyAttachment          onNewThumbnail-32be53a2               + created  
    30: aws:iam:RolePolicyAttachment          onNewThumbnail-fd1a00e5               + created  
    31: aws:lambda:Function                   onNewThumbnail                        + created  
    32: aws:ecs:TaskDefinition                ffmpegThumbTask                       + created  
    33: aws:lambda:Permission                 pulumi-thumnailer-testin              + created  
    34: aws:cloudwatch:LogSubscriptionFilter  ffmpegThumbTask                       + created  
    35: aws:cloudwatch:LogGroup               onNewThumbnail                        + created  
    36: aws:lambda:Permission                 onNewThumbnail                        + created  
    37: aws:lambda:Function                   onNewVideo                            + created  
    38: aws:cloudwatch:LogSubscriptionFilter  onNewThumbnail                        + created  
    39: aws:cloudwatch:LogGroup               onNewVideo                            + created  
    40: aws:lambda:Permission                 onNewVideo                            + created  
    41: aws:cloudwatch:LogSubscriptionFilter  onNewVideo                            + created  
    42: aws:s3:BucketNotification             bucket                                + created  
    ```

1.  View the stack outputs:

    ```
    $ pulumi stack output
    Current stack outputs (1):
        OUTPUT                                           VALUE
        bucketName                                       bucket-6120251
    ```

1.  Upload a video:

    ```
    $ aws s3 cp ./sample/video-small.mp4 s3://$(pulumi stack output bucketName)/small1_00-02.mp4
    upload: sample/video-small.mp4 to s3://bucket-0e25c2d/small1_00-02.mp4
    ```

1.  View the logs from both the Lambda function and the ECS task:

    ```
    $ pulumi logs -f
    Collecting logs since 2018-03-19T16:17:45.000-07:00.

    2018-03-19T17:17:39.121-07:00[                    onNewVideo] A new 383631B video was uploaded to small1_00-02.mp4 at 2018-03-20T00:17:38.734Z.
    2018-03-19T17:17:43.939-07:00[                    onNewVideo] Running thumbnailer task.
    2018-03-19T17:18:02.341-07:00[               ffmpegThumbTask] Starting...
    2018-03-19T17:18:02.341-07:00[               ffmpegThumbTask] Copying from S3 bucket-6120251/small1_00-02.mp4 to small1_00-02.mp4 ...
    download: s3://bucket-6120251/small1_00-02.mp4 to ./small1_00-02.mp4eted 256.0 KiB/374.6 KiB (3.0 MiB/s) with 1 file(s) remaining
    2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask] ffmpeg version 3.4.2 Copyright (c) 2000-2018 the FFmpeg developers
    2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   built with gcc 5.4.0 (Ubuntu 5.4.0-6ubuntu1~16.04.9) 20160609
    2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   configuration: --disable-debug --disable-doc --disable-ffplay --enable-shared --enable-avresample --enable-libopencore-amrnb --enable-libopencore-amrwb --enable-gpl --enable-libass --enable-libfreetype --enable-libvidstab --enable-libmp3lame --enable-libopenjpeg --enable-libopus --enable-libtheora --enable-libvorbis --enable-libvpx --enable-libx265 --enable-libxvid --enable-libx264 --enable-nonfree --enable-openssl --enable-libfdk_aac --enable-libkvazaar --enable-postproc --enable-small --enable-version3 --extra-cflags=-I/opt/ffmpeg/include --extra-ldflags=-L/opt/ffmpeg/lib --extra-libs=-ldl --prefix=/opt/ffmpeg
    2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   libavutil      55. 78.100 / 55. 78.100
    2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   libavcodec     57.107.100 / 57.107.100
    2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   libavformat    57. 83.100 / 57. 83.100
    2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   libavdevice    57. 10.100 / 57. 10.100
    2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   libavfilter     6.107.100 /  6.107.100
    2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   libavresample   3.  7.  0 /  3.  7.  0
    2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   libswscale      4.  8.100 /  4.  8.100
    2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   libswresample   2.  9.100 /  2.  9.100
    2018-03-19T17:18:02.929-07:00[               ffmpegThumbTask]   libpostproc    54.  7.100 / 54.  7.100
    2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask] Input #0, mov,mp4,m4a,3gp,3g2,mj2, from './small1_00-02.mp4':
    2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]   Metadata:
    2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]     major_brand     : mp42
    2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]     minor_version   : 0
    2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]     compatible_brands: mp42isomavc1
    2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]     creation_time   : 2010-03-20T21:29:11.000000Z
    2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]     encoder         : HandBrake 0.9.4 2009112300
    2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]   Duration: 00:00:05.57, start: 0.000000, bitrate: 551 kb/s
    2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]     Stream #0:0(und): Video: h264 (avc1 / 0x31637661), yuv420p(tv, bt709), 560x320, 465 kb/s, 30 fps, 30 tbr, 90k tbn, 60 tbc (default)
    2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]     Metadata:
    2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]       creation_time   : 2010-03-20T21:29:11.000000Z
    2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]       encoder         : JVT/AVC Coding
    2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]     Stream #0:1(eng): Audio: aac (mp4a / 0x6134706D), 48000 Hz, mono, fltp, 83 kb/s (default)
    2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask] Stream mapping:
    2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask]   Stream #0:0 -> #0:0 (h264 (native) -> png (native))
    2018-03-19T17:18:02.937-07:00[               ffmpegThumbTask] Press [q] to stop, [?] for help
    2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask] Output #0, image2, to 'small1.png':
    2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask]   Metadata:
    2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask]     major_brand     : mp42
    2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask]     minor_version   : 0
    2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask]     compatible_brands: mp42isomavc1
    2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask]     encoder         : Lavf57.83.100
    2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask]     Stream #0:0(und): Video: png, rgb24, 560x320, q=2-31, 200 kb/s, 30 fps, 30 tbn, 30 tbc (default)
    2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask]     Metadata:
    2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask]       creation_time   : 2010-03-20T21:29:11.000000Z
    2018-03-19T17:18:02.942-07:00[               ffmpegThumbTask]       encoder         : Lavc57.107.100 png
    2018-03-19T17:18:03.005-07:00[               ffmpegThumbTask] frame=    1 fps=0.0 q=-0.0 Lsize=N/A time=00:00:00.03 bitrate=N/A speed=0.494x
    2018-03-19T17:18:03.005-07:00[               ffmpegThumbTask] video:182kB audio:0kB subtitle:0kB other streams:0kB global headers:0kB muxing overhead: unknown
    2018-03-19T17:18:03.007-07:00[               ffmpegThumbTask] Copying small1.png to S3 at bucket-6120251/small1.png ...
    upload: ./small1.png to s3://bucket-6120251/small1.png            pleted 182.2 KiB/182.2 KiB (1.7 MiB/s) with 1 file(s) remaining
    2018-03-19T17:18:03.761-07:00[                onNewThumbnail] A new 186620B thumbnail was saved to small1.png at 2018-03-20T00:18:03.389Z.
    ```

1.  Download the key frame:

    ```
    $ aws s3 cp s3://$(pulumi stack output bucketName)/small1.png small1.png
    download: s3://bucket-0e25c2d/small1.png to ./small1.png            
    ```

