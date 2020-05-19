FROM node:12

WORKDIR /var/build
COPY ./package*.json ./

RUN npm install

COPY . .