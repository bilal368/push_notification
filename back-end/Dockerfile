FROM node:20.6.0-bullseye
RUN mkdir -p /opt/Xlogix/Docker/node
WORKDIR /opt/Xlogix/Docker/node
COPY package.json  /opt/Xlogix/Docker/node
COPY package-lock.json /opt/Xlogix/Docker/node
RUN rm -rf node_modules
RUN npm install
RUN npm ci
COPY . .
EXPOSE 3009
EXPOSE 6379
WORKDIR /opt/Xlogix/Docker/node/src
CMD ["node","server.js"]



