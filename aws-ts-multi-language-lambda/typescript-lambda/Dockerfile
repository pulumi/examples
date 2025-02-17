FROM node:alpine@sha256:0a29d8a047149079bf48dab598f287815e39867d547e8f3935cfdece0a4379cc AS base
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