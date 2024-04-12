FROM jrottenberg/ffmpeg

RUN apt-get update --yes && \
    apt-get install curl unzip --yes && \
    apt-get clean --yes

# Install AWS v2 cli
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf aws

WORKDIR /tmp/workdir

ENTRYPOINT \
  echo "Starting ffmpeg task..." && \
  echo "Copying video from s3://${S3_BUCKET}/${INPUT_VIDEO} to ${INPUT_VIDEO}..." && \
  aws s3 cp s3://${S3_BUCKET}/${INPUT_VIDEO} ./${INPUT_VIDEO} && \
  ffmpeg -v error -i ./${INPUT_VIDEO} -ss ${TIME_OFFSET} -vframes 1 -f image2 -an -y ${OUTPUT_FILE} && \
  echo "Copying thumbnail to S3://${S3_BUCKET}/${OUTPUT_FILE} ..." && \
  aws s3 cp ./${OUTPUT_FILE} s3://${S3_BUCKET}/${OUTPUT_FILE}
