FROM python:3.13.2-alpine@sha256:323a717dc4a010fee21e3f1aac738ee10bb485de4e7593ce242b36ee48d6b352 AS base

WORKDIR /app

FROM base AS packages

COPY requirements.txt .
RUN pip install -r requirements.txt --target ./package

FROM scratch
COPY lambda.py .
COPY --from=packages /app/package/ .