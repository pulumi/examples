# Video Thumbnailer

A video thumbnail extractor using serverless functions and containers.

Loosely derived from the example at https://serverless.com/blog/serverless-application-for-long-running-process-fargate-lambda/.

## Running the App

Create a new stack:

```
$ pulumi stack init --local
Enter a stack name: testing
```

Configure the app deployment:

```
$ pulumi config set aws:region us-east-1
$ pulumi config set cloud-aws:ecsAutoCluster true
```

Preview the deployment of the application:

``` 
$ pulumi preview
Previewing changes:
[623 lines elided...]
info: 59 changes previewed:
    + 59 resources to create
```

Perform the deployment:

```
$ pulumi update
Performing changes:
[975 lines elided...]
info: 59 changes performed:
    + 59 resources created
Update duration: 9m59.754811909s
```

See the outputs:

```
$ pulumi stack output
Current stack outputs (1):
    OUTPUT                                           VALUE
    bucketName                                       bucket-6120251
```

Upload a video:

```
$ aws s3 cp ~/Downloads/small.mp4 s3://$(pulumi stack output bucketName)/small1_00-02.mp4
upload: ../../../../../../Downloads/small.mp4 to s3://bucket-6120251/small1_00-02.mp4
```

See the logs from the application:

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
