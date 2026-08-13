FROM node:22-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436

WORKDIR /client

EXPOSE 3000

# `serve` hosts the production build produced below.
RUN npm install --global serve

COPY client/package.json /client/package.json

RUN npm install

COPY client /client

RUN npm run build

CMD [ "/client/startClient.sh" ]
