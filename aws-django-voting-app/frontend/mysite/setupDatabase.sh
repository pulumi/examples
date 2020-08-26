#!/bin/bash
set -exu
python3 /mysite/manage.py makemigrations
python3 /mysite/manage.py migrate
export DJANGO_SUPERUSER_PASSWORD=$DJANGO_PASSWORD 
python3 /mysite/manage.py createsuperuser \
    --no-input \
    --username=$DJANGO_NAME \
    --email=$DJANGO_NAME@example.com
