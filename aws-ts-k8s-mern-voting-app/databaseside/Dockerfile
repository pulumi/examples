FROM ubuntu:24.04@sha256:72297848456d5d37d1262630108ab308d3e9ec7ed1c3286a32fe09856619a782

WORKDIR /

EXPOSE 5432

RUN apt update && \
    apt install -y mongodb

ADD database /database

CMD [ "/database/startDatabase.sh" ]
