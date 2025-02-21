FROM node:22-alpine@sha256:9bef0ef1e268f60627da9ba7d7605e8831d5b56ad07487d24d1aa386336d1944
WORKDIR /app

COPY package.json .
RUN npm i
COPY index.js .

EXPOSE 3000

CMD [ "npm", "start" ]