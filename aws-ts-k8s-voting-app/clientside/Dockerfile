FROM ubuntu:24.04@sha256:72297848456d5d37d1262630108ab308d3e9ec7ed1c3286a32fe09856619a782

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
