FROM ubuntu:18.04

WORKDIR /

EXPOSE 80

RUN apt-get update && \
    apt install -y gcc python3-dev python3-pip mysql-client-core-5.7 libmysqlclient-dev

ADD requirements.txt /

RUN pip3 install -r requirements.txt

ADD app /app

CMD [ "python3", "app/manage.py", "runserver", "0.0.0.0:80" ]
