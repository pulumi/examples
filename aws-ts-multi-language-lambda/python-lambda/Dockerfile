FROM python:3.12.4-alpine@sha256:63094abdaf49e046da9f6529ecd6ce4d853d9bfbf00a25c52bbbb68b3223b490 AS base

WORKDIR /app

FROM base AS packages

COPY requirements.txt .
RUN pip install -r requirements.txt --target ./package

FROM scratch
COPY lambda.py .
COPY --from=packages /app/package/ .