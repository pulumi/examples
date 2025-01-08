FROM node:8.9.3-alpine@sha256:40201c973cf40708f06205b22067f952dd46a29cecb7a74b873ce303ad0d11a5
RUN mkdir -p /usr/src/app
COPY ./app/* /usr/src/app/
WORKDIR /usr/src/app
RUN npm install
CMD node /usr/src/app/index.js
