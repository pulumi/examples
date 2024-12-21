FROM ubuntu:18.04@sha256:152dc042452c496007f07ca9127571cb9c29697f42acbfad72324b2bb2e43c98

WORKDIR /

EXPOSE 5432

RUN apt update && \
    apt install -y mongodb

ADD database /database

CMD [ "/database/startDatabase.sh" ]
