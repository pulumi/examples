FROM node:alpine@sha256:6eaab645f9568369419be82b44474f70325a8166afb4c98f278d3595cf3062ff AS base
WORKDIR /app

FROM base AS install

RUN mkdir -p /tmp/install
COPY package*.json /tmp/install
RUN cd /tmp/install && npm ci

FROM base AS build

COPY --from=install /tmp/install/node_modules node_modules
COPY --from=install /tmp/install/package*.json .
COPY index.ts .
COPY tsconfig.json .

RUN npx tsc index.ts

FROM scratch

COPY --from=install /tmp/install/node_modules node_modules
COPY --from=install /tmp/install/package*.json .
COPY --from=build /app/index.js .