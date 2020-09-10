FROM ubuntu:18.04

WORKDIR /

EXPOSE 5432

RUN apt update && \
    apt install -y postgresql

ADD database /database

CMD [ "/database/startDatabase.sh" ]
