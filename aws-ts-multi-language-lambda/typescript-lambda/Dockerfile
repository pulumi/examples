FROM node:alpine@sha256:dc4d20572e425f9d4c68a6f9c382fbcfec3fa2f8ef0b12cb1d96feabdb479a48 AS base
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