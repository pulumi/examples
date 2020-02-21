FROM pulumi/pulumi	

# RUN apk add --no-cache make gcc g++ python
WORKDIR /home/theia
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


FROM pulumi/pulumi	
# See : https://github.com/theia-ide/theia-apps/issues/34
RUN addgroup theia && \
    adduser --ingroup theia --shell /bin/sh --disabled-login theia;
RUN chmod g+rw /home && \
    mkdir -p /home/project && \
    chown -R theia:theia /home/theia && \
    chown -R theia:theia /home/project;
ENV HOME /home/theia
WORKDIR /home/theia
COPY --from=0 --chown=theia:theia /home/theia /home/theia

ADD . /home/project/

EXPOSE 3000
ENV SHELL /bin/bash
ENV USE_LOCAL_GIT true
USER root
ENTRYPOINT [ "node", "/home/theia/src-gen/backend/main.js", "/home/project", "--hostname=0.0.0.0" ]