FROM ubuntu:24.04@sha256:72297848456d5d37d1262630108ab308d3e9ec7ed1c3286a32fe09856619a782

WORKDIR /

EXPOSE 80

RUN apt-get update && \
    apt install -y gcc python3-dev python3-pip mysql-client-core-5.7 libmysqlclient-dev

ADD requirements.txt /

RUN pip3 install -r requirements.txt

ADD mysite /mysite

CMD [ "python3", "/mysite/manage.py", "runserver", "0.0.0.0:80" ]
