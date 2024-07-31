FROM python:3.12.4-alpine AS base

WORKDIR /app

FROM base AS packages

COPY requirements.txt .
RUN pip install -r requirements.txt --target ./package

FROM scratch
COPY lambda.py .
COPY --from=packages /app/package/ .