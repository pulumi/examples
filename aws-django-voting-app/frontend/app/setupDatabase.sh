#!/bin/bash
set -exu
python3 /app/manage.py makemigrations
python3 /app/manage.py migrate
export DJANGO_SUPERUSER_PASSWORD=$DJANGO_PASSWORD 
python3 /app/manage.py createsuperuser \
    --no-input \
    --username=$DJANGO_NAME \
    --email=$DJANGO_NAME@example.com
