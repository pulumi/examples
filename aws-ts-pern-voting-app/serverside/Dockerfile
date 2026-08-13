FROM node:22-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436

WORKDIR /server

EXPOSE 5000

COPY server/package.json /server/package.json

RUN npm install

COPY server /server

CMD [ "/server/startServer.sh" ]
