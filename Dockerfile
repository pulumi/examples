FROM pulumi/pulumi:latest

RUN mkdir -p /misc/theia
WORKDIR /misc/theia
ADD docker.package.json ./package.json
ARG GITHUB_TOKEN
RUN yarn --pure-lockfile && \
    NODE_OPTIONS="--max_old_space_size=4096" yarn theia build && \
    yarn --production && \
    yarn autoclean --init && \
    echo *.ts >> .yarnclean && \
    echo *.ts.map >> .yarnclean && \
    echo *.spec.* >> .yarnclean && \
    yarn autoclean --force && \
    yarn cache clean

FROM pulumi/pulumi:latest
# See : https://github.com/theia-ide/theia-apps/issues/34
RUN mkdir -p /misc/theia
RUN mkdir -p /home/project/bin
RUN addgroup theia && \
    adduser --ingroup theia --shell /bin/sh --disabled-login theia;
RUN chmod g+rw /home && \
    chmod g+rw /misc && \
    mkdir -p /home/project/src/github.com/pulumi/examples && \
    chown -R theia:theia /misc/theia && \
    chown -R theia:theia /home/project/src/github.com/pulumi/examples;
ENV HOME /misc/theia
WORKDIR /misc/theia
COPY --from=0 --chown=theia:theia /misc/theia /misc/theia

RUN curl -O https://dl.google.com/go/go1.13.8.linux-amd64.tar.gz
RUN tar -C /usr/local -xzf go1.13.8.linux-amd64.tar.gz

RUN curl -O https://packages.microsoft.com/config/ubuntu/19.04/packages-microsoft-prod.deb && \
  dpkg -i packages-microsoft-prod.deb && \
  rm packages-microsoft-prod.deb && \
  apt-get update -y && \
  apt-get install -y \
    apt-transport-https \
    dotnet-sdk-3.1

ADD . /home/project/src/github.com/pulumi/examples/

EXPOSE 3000
ENV SHELL /bin/bash
ENV USE_LOCAL_GIT true
ENV GOPATH /home/project
ENV PATH $PATH:/usr/local/go/bin:$GOPATH/bin

RUN curl https://raw.githubusercontent.com/golang/dep/master/install.sh | sh

# TODO: https://github.com/pulumi/pulumi/issues/1549
RUN pulumi plugin install resource aws 1.23.0
RUN pulumi plugin install resource gcp 2.7.0
RUN pulumi plugin install resource azure 1.14.0

USER root
ENTRYPOINT [ "node", "/misc/theia/src-gen/backend/main.js", "/home/project/src/github.com/pulumi/examples", "--hostname=0.0.0.0" ]
