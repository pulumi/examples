FROM node:15-alpine@sha256:6edd37368174c15d4cc59395ca2643be8e2a1c9846714bc92c5f5c5a92fb8929 as build
WORKDIR /app
COPY package*.json .
RUN npm ci --only=production
COPY index.js .
FROM node:15-alpine@sha256:6edd37368174c15d4cc59395ca2643be8e2a1c9846714bc92c5f5c5a92fb8929
WORKDIR /app
COPY --from=build /app .
EXPOSE 80
CMD [ "npm", "start" ]