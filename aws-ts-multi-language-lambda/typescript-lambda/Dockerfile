FROM node:alpine@sha256:6eae672406a2bc8ed93eab6f9f76a02eb247e06ba82b2f5032c0a4ae07e825ba AS base
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