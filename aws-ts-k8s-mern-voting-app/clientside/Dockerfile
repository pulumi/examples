FROM ubuntu:18.04@sha256:152dc042452c496007f07ca9127571cb9c29697f42acbfad72324b2bb2e43c98

WORKDIR /

EXPOSE 3000

RUN apt update && \
    apt install -y curl

RUN curl -sL https://deb.nodesource.com/setup_14.x | bash - && \
    apt-get install -y nodejs

ADD client/package.json /client/package.json

RUN cd client && npm install

ADD client /client

RUN cd client && npm run build

CMD [ "/client/startClient.sh" ]
