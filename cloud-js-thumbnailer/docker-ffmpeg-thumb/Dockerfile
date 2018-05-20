FROM jrottenberg/ffmpeg

RUN apt-get update && \
    apt-get install python-dev python-pip -y && \
    apt-get clean

RUN pip install awscli

WORKDIR /tmp/workdir

COPY copy_thumb.sh /tmp/workdir
COPY copy_video.sh /tmp/workdir

ENTRYPOINT echo "Starting..." && \
  ./copy_video.sh && \
  ffmpeg -i ./${INPUT_VIDEO_FILE_NAME} -ss ${POSITION_TIME_DURATION} -vframes 1 -f image2 -an -y ${OUTPUT_THUMBS_FILE_NAME} && \
  ./copy_thumb.sh
