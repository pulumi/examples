FROM ubuntu:18.04

WORKDIR /

EXPOSE 5000

RUN apt update && \
    apt install -y curl postgresql

RUN curl -sL https://deb.nodesource.com/setup_14.x | bash - && \
    apt-get install -y nodejs

ADD server /server

RUN cd server && npm install

CMD [ "/server/startServer.sh" ]
