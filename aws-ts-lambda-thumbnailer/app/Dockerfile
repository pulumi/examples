FROM amazon/aws-lambda-nodejs:12@sha256:1296174701453f63a24c1157c22289b236d92f379d478cc93b00dda2873c2ed4
ARG FUNCTION_DIR="/var/task"

# Install tar and xz
RUN yum install tar xz unzip -y

# Install awscli
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" -s
RUN unzip -q awscliv2.zip
RUN ./aws/install

# Install ffmpeg
# RUN curl https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz -s
# Note that we use a local copy of ffmpeg in this example to avoid downloading it, which sometimes errors out.
COPY ffmpeg.tar.xz .
RUN tar -xf ffmpeg.tar.xz
RUN mv ffmpeg-*-amd64-static/ffmpeg /usr/bin

# Create function directory
RUN mkdir -p ${FUNCTION_DIR}

# Copy handler function and package.json
COPY index.js ${FUNCTION_DIR}

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "index.handler" ]
